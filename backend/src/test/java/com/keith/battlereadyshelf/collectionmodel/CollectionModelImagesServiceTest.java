package com.keith.battlereadyshelf.collectionmodel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionEntity;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelImagesService.VariantUploadRequest;
import com.keith.battlereadyshelf.error.ApiException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionMapperImpl;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionRepository;
import com.keith.battlereadyshelf.modeldefinition.ModelDefinitionsService;
import com.keith.battlereadyshelf.storage.PresignedUrlService;
import com.keith.battlereadyshelf.storage.StorageKeyGenerator;
import com.keith.battlereadyshelf.storage.StorageProperties;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class CollectionModelImagesServiceTest {
    private static final VariantUploadRequest DEFAULT_VARIANT_REQUEST =
            new VariantUploadRequest("image/jpeg", 1024L);

    @Mock private CollectionModelRepository collectionModelRepository;
    @Mock private ArmyCollectionRepository armyCollectionRepository;
    @Mock private ModelDefinitionRepository modelDefinitionRepository;
    @Mock private CollectionModelImageRepository collectionModelImageRepository;
    @Mock private CollectionModelWargearSelectionRepository collectionModelWargearSelectionRepository;
    @Mock private ModelDefinitionsService modelDefinitionsService;
    @Mock private PresignedUrlService presignedUrlService;

    @Captor private ArgumentCaptor<CollectionModelImageEntity> collectionModelImageEntityCaptor;

    private CollectionModelsService collectionModelsService;
    private CollectionModelImagesService collectionModelImagesService;

    @BeforeEach
    void setUp() {
        collectionModelsService =
                new CollectionModelsService(
                        collectionModelRepository,
                        armyCollectionRepository,
                        modelDefinitionRepository,
                        collectionModelImageRepository,
                        collectionModelWargearSelectionRepository,
                        new CollectionModelMapperImpl(new ModelDefinitionMapperImpl()),
                        new CollectionModelImageMapperImpl(),
                        modelDefinitionsService,
                        presignedUrlService);

        var storageProperties =
                new StorageProperties("battlereadyshelf-dev", "keith", true, 10);

        collectionModelImagesService =
                new CollectionModelImagesService(
                        collectionModelsService,
                        collectionModelImageRepository,
                        new CollectionModelImageMapperImpl(),
                        storageProperties,
                        new StorageKeyGenerator(storageProperties),
                        presignedUrlService);
    }

    private void stubOwnedCollectionModel(UUID userId, UUID armyCollectionId, UUID collectionModelId) {
        when(collectionModelRepository.findById(collectionModelId))
                .thenReturn(
                        Optional.of(
                                CollectionModelEntity.builder()
                                        .id(collectionModelId)
                                        .armyCollectionId(armyCollectionId)
                                        .build()));
        when(armyCollectionRepository.findById(armyCollectionId))
                .thenReturn(
                        Optional.of(
                                ArmyCollectionEntity.builder()
                                        .id(armyCollectionId)
                                        .userId(userId)
                                        .name("Starter Collection")
                                        .build()));
    }

    @Test
    void createUploadUrl_persistsImageAndReturnsPresignedUrls_whenCollectionModelIsOwned() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        var createdImageId = UUID.randomUUID();
        var expectedUploadUrl = URI.create("https://example-r2-endpoint/upload");

        stubOwnedCollectionModel(userId, armyCollectionId, collectionModelId);
        when(collectionModelImageRepository.save(any(CollectionModelImageEntity.class)))
                .thenAnswer(
                        invocation -> {
                            CollectionModelImageEntity entity = invocation.getArgument(0);
                            entity.setId(createdImageId);
                            return entity;
                        });
        when(presignedUrlService.presignUpload(anyString(), anyString()))
                .thenReturn(expectedUploadUrl);
        var expectedDownloadUrl = URI.create("https://example-r2-endpoint/download");
        when(presignedUrlService.presignDownload(anyString())).thenReturn(expectedDownloadUrl);

        var result =
                collectionModelImagesService.createUploadUrl(
                        userId,
                        collectionModelId,
                        DEFAULT_VARIANT_REQUEST,
                        DEFAULT_VARIANT_REQUEST,
                        DEFAULT_VARIANT_REQUEST);

        verify(collectionModelImageRepository).save(collectionModelImageEntityCaptor.capture());
        var savedEntity = collectionModelImageEntityCaptor.getValue();
        assertThat(savedEntity.getCollectionModelId()).isEqualTo(collectionModelId);
        assertThat(savedEntity.getOriginal().getContentType()).isEqualTo("image/jpeg");
        assertThat(savedEntity.getOriginal().getSizeBytes()).isEqualTo(1024L);
        var expectedKeyPrefix = "keith/users/" + userId + "/models/" + collectionModelId + "/";
        assertThat(savedEntity.getOriginal().getStorageKey())
                .startsWith(expectedKeyPrefix)
                .endsWith("/original.jpg");
        assertThat(savedEntity.getLarge().getStorageKey())
                .startsWith(expectedKeyPrefix)
                .endsWith("/large.jpg");
        assertThat(savedEntity.getThumbnail().getStorageKey())
                .startsWith(expectedKeyPrefix)
                .endsWith("/thumbnail.jpg");

        assertThat(result.image().getId()).isEqualTo(createdImageId);
        assertThat(result.image().getContentType()).isEqualTo("image/jpeg");
        assertThat(result.image().getOriginalUrl()).isEqualTo(expectedDownloadUrl);
        assertThat(result.image().getLargeUrl()).isEqualTo(expectedDownloadUrl);
        assertThat(result.image().getThumbnailUrl()).isEqualTo(expectedDownloadUrl);
        assertThat(result.uploadUrls().original()).isEqualTo(expectedUploadUrl);
        assertThat(result.uploadUrls().large()).isEqualTo(expectedUploadUrl);
        assertThat(result.uploadUrls().thumbnail()).isEqualTo(expectedUploadUrl);
    }

    @Test
    void createUploadUrl_throwsNotFound_whenCollectionModelNotOwnedByUser() {
        var userId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();

        stubOwnedCollectionModel(otherUserId, armyCollectionId, collectionModelId);

        assertThatThrownBy(
                        () ->
                                collectionModelImagesService.createUploadUrl(
                                        userId,
                                        collectionModelId,
                                        DEFAULT_VARIANT_REQUEST,
                                        DEFAULT_VARIANT_REQUEST,
                                        DEFAULT_VARIANT_REQUEST))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void createUploadUrl_throwsBadRequest_whenContentTypeUnsupported() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();

        stubOwnedCollectionModel(userId, armyCollectionId, collectionModelId);

        var unsupportedVariant = new VariantUploadRequest("application/pdf", 1024L);

        assertThatThrownBy(
                        () ->
                                collectionModelImagesService.createUploadUrl(
                                        userId,
                                        collectionModelId,
                                        unsupportedVariant,
                                        DEFAULT_VARIANT_REQUEST,
                                        DEFAULT_VARIANT_REQUEST))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void createUploadUrl_throwsBadRequest_whenFileTooLarge() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();

        stubOwnedCollectionModel(userId, armyCollectionId, collectionModelId);

        var tooManyBytes = 11L * 1024 * 1024;
        var tooLargeVariant = new VariantUploadRequest("image/jpeg", tooManyBytes);

        assertThatThrownBy(
                        () ->
                                collectionModelImagesService.createUploadUrl(
                                        userId,
                                        collectionModelId,
                                        tooLargeVariant,
                                        DEFAULT_VARIANT_REQUEST,
                                        DEFAULT_VARIANT_REQUEST))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void createUploadUrl_throwsBadRequest_whenUploadsDisabled() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();

        stubOwnedCollectionModel(userId, armyCollectionId, collectionModelId);

        var disabledStorageProperties =
                new StorageProperties("battlereadyshelf-dev", "keith", false, 10);
        var serviceWithDisabledUploads =
                new CollectionModelImagesService(
                        collectionModelsService,
                        collectionModelImageRepository,
                        new CollectionModelImageMapperImpl(),
                        disabledStorageProperties,
                        new StorageKeyGenerator(disabledStorageProperties),
                        presignedUrlService);

        assertThatThrownBy(
                        () ->
                                serviceWithDisabledUploads.createUploadUrl(
                                        userId,
                                        collectionModelId,
                                        DEFAULT_VARIANT_REQUEST,
                                        DEFAULT_VARIANT_REQUEST,
                                        DEFAULT_VARIANT_REQUEST))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void deleteImage_deletesFromStorageAndRepository_whenImageIsOwned() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        var imageId = UUID.randomUUID();

        stubOwnedCollectionModel(userId, armyCollectionId, collectionModelId);
        var keyPrefix =
                "keith/users/" + userId + "/models/" + collectionModelId + "/" + imageId + "/";
        var imageEntity =
                CollectionModelImageEntity.builder()
                        .id(imageId)
                        .collectionModelId(collectionModelId)
                        .original(
                                ImageVariant.builder()
                                        .storageKey(keyPrefix + "original.jpg")
                                        .contentType("image/jpeg")
                                        .build())
                        .large(
                                ImageVariant.builder()
                                        .storageKey(keyPrefix + "large.jpg")
                                        .contentType("image/jpeg")
                                        .build())
                        .thumbnail(
                                ImageVariant.builder()
                                        .storageKey(keyPrefix + "thumbnail.jpg")
                                        .contentType("image/jpeg")
                                        .build())
                        .build();
        when(collectionModelImageRepository.findById(imageId)).thenReturn(Optional.of(imageEntity));

        collectionModelImagesService.deleteImage(userId, collectionModelId, imageId);

        verify(presignedUrlService).deleteObject(imageEntity.getOriginal().getStorageKey());
        verify(presignedUrlService).deleteObject(imageEntity.getLarge().getStorageKey());
        verify(presignedUrlService).deleteObject(imageEntity.getThumbnail().getStorageKey());
        verify(collectionModelImageRepository).delete(imageEntity);
    }

    @Test
    void deleteImage_throwsNotFound_whenImageDoesNotBelongToCollectionModel() {
        var userId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        var otherCollectionModelId = UUID.randomUUID();
        var imageId = UUID.randomUUID();

        stubOwnedCollectionModel(userId, armyCollectionId, collectionModelId);
        when(collectionModelImageRepository.findById(imageId))
                .thenReturn(
                        Optional.of(
                                CollectionModelImageEntity.builder()
                                        .id(imageId)
                                        .collectionModelId(otherCollectionModelId)
                                        .original(
                                                ImageVariant.builder()
                                                        .storageKey("some/other/original.jpg")
                                                        .contentType("image/jpeg")
                                                        .build())
                                        .build()));

        assertThatThrownBy(
                        () -> collectionModelImagesService.deleteImage(userId, collectionModelId, imageId))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteImage_throwsNotFound_whenCollectionModelNotOwnedByUser() {
        var userId = UUID.randomUUID();
        var otherUserId = UUID.randomUUID();
        var armyCollectionId = UUID.randomUUID();
        var collectionModelId = UUID.randomUUID();
        var imageId = UUID.randomUUID();

        stubOwnedCollectionModel(otherUserId, armyCollectionId, collectionModelId);

        assertThatThrownBy(
                        () -> collectionModelImagesService.deleteImage(userId, collectionModelId, imageId))
                .isInstanceOf(NotFoundException.class);
    }
}
