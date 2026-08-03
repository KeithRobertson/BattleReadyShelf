package com.keith.battlereadyshelf.collectionmodel;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

import com.keith.battlereadyshelf.error.ApiException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.CollectionModelImage;
import com.keith.battlereadyshelf.storage.PresignedUrlService;
import com.keith.battlereadyshelf.storage.StorageKeyGenerator;
import com.keith.battlereadyshelf.storage.StorageProperties;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Instant;
import java.util.UUID;

@Service
public class CollectionModelImagesService {
    private final CollectionModelsService collectionModelsService;
    private final CollectionModelImageRepository collectionModelImageRepository;
    private final CollectionModelImageMapper collectionModelImageMapper;
    private final StorageProperties storageProperties;
    private final StorageKeyGenerator storageKeyGenerator;
    private final PresignedUrlService presignedUrlService;

    public CollectionModelImagesService(
            CollectionModelsService collectionModelsService,
            CollectionModelImageRepository collectionModelImageRepository,
            CollectionModelImageMapper collectionModelImageMapper,
            StorageProperties storageProperties,
            StorageKeyGenerator storageKeyGenerator,
            PresignedUrlService presignedUrlService) {
        this.collectionModelsService = collectionModelsService;
        this.collectionModelImageRepository = collectionModelImageRepository;
        this.collectionModelImageMapper = collectionModelImageMapper;
        this.storageProperties = storageProperties;
        this.storageKeyGenerator = storageKeyGenerator;
        this.presignedUrlService = presignedUrlService;
    }

    public record UploadUrlResult(CollectionModelImage image, URI uploadUrl) {}

    public UploadUrlResult createUploadUrl(
            UUID userId, UUID collectionModelId, String contentType, long contentLengthBytes) {
        var collectionModel =
                collectionModelsService.requireOwnedCollectionModel(userId, collectionModelId);

        if (!storageProperties.isEnabled()) {
            throw new ApiException(BAD_REQUEST, "Image uploads are currently disabled.");
        }
        if (!storageKeyGenerator.isSupportedContentType(contentType)) {
            throw new ApiException(BAD_REQUEST, "Unsupported image content type: " + contentType);
        }
        if (contentLengthBytes <= 0
                || contentLengthBytes > storageProperties.getMaxFileSizeBytes()) {
            throw new ApiException(
                    BAD_REQUEST,
                    "File size must be between 1 byte and "
                            + storageProperties.getMaxFileSizeBytes()
                            + " bytes.");
        }

        var fileId = UUID.randomUUID();
        var storageKey =
                storageKeyGenerator.generateKey(
                        userId, collectionModel.getId(), fileId, contentType);

        var savedImage =
                collectionModelImageRepository.save(
                        CollectionModelImageEntity.builder()
                                .collectionModelId(collectionModel.getId())
                                .storageKey(storageKey)
                                .contentType(contentType)
                                .sizeBytes(contentLengthBytes)
                                .createdAt(Instant.now())
                                .build());

        var uploadUrl = presignedUrlService.presignUpload(storageKey, contentType);

        return new UploadUrlResult(collectionModelImageMapper.toDto(savedImage), uploadUrl);
    }

    public void deleteImage(UUID userId, UUID collectionModelId, UUID imageId) {
        var collectionModel =
                collectionModelsService.requireOwnedCollectionModel(userId, collectionModelId);

        var image =
                collectionModelImageRepository
                        .findById(imageId)
                        .filter(
                                entity ->
                                        entity.getCollectionModelId()
                                                .equals(collectionModel.getId()))
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Collection model image not found: " + imageId));

        presignedUrlService.deleteObject(image.getStorageKey());
        collectionModelImageRepository.delete(image);
    }
}
