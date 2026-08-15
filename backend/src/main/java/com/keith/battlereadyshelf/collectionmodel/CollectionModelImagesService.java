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
    private static final String VARIANT_LARGE = "large";
    private static final String VARIANT_THUMBNAIL = "thumbnail";

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

    /** A requested upload for a single rendition of an image. */
    public record VariantUploadRequest(String contentType, long contentLengthBytes) {}

    public record UploadUrls(URI large, URI thumbnail) {}

    public record UploadUrlResult(CollectionModelImage image, UploadUrls uploadUrls) {}

    public UploadUrlResult createUploadUrl(
            UUID userId,
            UUID collectionModelId,
            VariantUploadRequest large,
            VariantUploadRequest thumbnail) {
        var collectionModel =
                collectionModelsService.requireOwnedCollectionModel(userId, collectionModelId);

        if (!storageProperties.isEnabled()) {
            throw new ApiException(BAD_REQUEST, "Image uploads are currently disabled.");
        }

        var imageId = UUID.randomUUID();
        var largeVariant =
                buildVariant(userId, collectionModel.getId(), imageId, VARIANT_LARGE, large);
        var thumbnailVariant =
                buildVariant(
                        userId, collectionModel.getId(), imageId, VARIANT_THUMBNAIL, thumbnail);

        var savedImage =
                collectionModelImageRepository.save(
                        CollectionModelImageEntity.builder()
                                .id(imageId)
                                .collectionModelId(collectionModel.getId())
                                .large(largeVariant)
                                .thumbnail(thumbnailVariant)
                                .createdAt(Instant.now())
                                .build());

        var uploadUrls =
                new UploadUrls(
                        presignedUrlService.presignUpload(
                                largeVariant.getStorageKey(), large.contentType()),
                        presignedUrlService.presignUpload(
                                thumbnailVariant.getStorageKey(), thumbnail.contentType()));

        var imageDto = collectionModelImageMapper.toDto(savedImage);
        imageDto.setLargeUrl(presignedUrlService.presignDownload(largeVariant.getStorageKey()));
        imageDto.setThumbnailUrl(
                presignedUrlService.presignDownload(thumbnailVariant.getStorageKey()));

        return new UploadUrlResult(imageDto, uploadUrls);
    }

    private ImageVariant buildVariant(
            UUID userId,
            UUID collectionModelId,
            UUID imageId,
            String variant,
            VariantUploadRequest request) {
        if (!storageKeyGenerator.isSupportedContentType(request.contentType())) {
            throw new ApiException(
                    BAD_REQUEST,
                    "Unsupported image content type for " + variant + ": " + request.contentType());
        }
        if (request.contentLengthBytes() <= 0
                || request.contentLengthBytes() > storageProperties.getMaxFileSizeBytes()) {
            throw new ApiException(
                    BAD_REQUEST,
                    "File size for "
                            + variant
                            + " must be between 1 byte and "
                            + storageProperties.getMaxFileSizeBytes()
                            + " bytes.");
        }

        var storageKey =
                storageKeyGenerator.generateKey(
                        userId, collectionModelId, imageId, variant, request.contentType());

        return ImageVariant.builder()
                .storageKey(storageKey)
                .contentType(request.contentType())
                .sizeBytes(request.contentLengthBytes())
                .build();
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

        deleteVariantIfPresent(image.getLarge());
        deleteVariantIfPresent(image.getThumbnail());
        collectionModelImageRepository.delete(image);
    }

    private void deleteVariantIfPresent(ImageVariant variant) {
        if (variant != null && variant.getStorageKey() != null) {
            presignedUrlService.deleteObject(variant.getStorageKey());
        }
    }
}
