package com.keith.battlereadyshelf.collectionmodel;

import com.keith.battlereadyshelf.generated.api.CollectionModelImagesApi;
import com.keith.battlereadyshelf.generated.model.CollectionModelImageUploadRequest;
import com.keith.battlereadyshelf.generated.model.CollectionModelImageUploadResponse;
import com.keith.battlereadyshelf.generated.model.ImageVariantUploadRequest;
import com.keith.battlereadyshelf.generated.model.ImageVariantUploadUrls;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CollectionModelImagesController implements CollectionModelImagesApi {
    private final CollectionModelImagesService collectionModelImagesService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<CollectionModelImageUploadResponse> createCollectionModelImageUploadUrl(
            UUID collectionModelId,
            CollectionModelImageUploadRequest collectionModelImageUploadRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        var result =
                collectionModelImagesService.createUploadUrl(
                        currentUser.id(),
                        collectionModelId,
                        toVariantRequest(collectionModelImageUploadRequest.getLarge()),
                        toVariantRequest(collectionModelImageUploadRequest.getThumbnail()));

        var uploadUrls =
                new ImageVariantUploadUrls(result.uploadUrls().large(), result.uploadUrls().thumbnail());

        return ResponseEntity.status(201)
                .body(new CollectionModelImageUploadResponse(result.image(), uploadUrls));
    }

    private static CollectionModelImagesService.VariantUploadRequest toVariantRequest(
            ImageVariantUploadRequest request) {
        return new CollectionModelImagesService.VariantUploadRequest(
                request.getContentType(), request.getContentLengthBytes());
    }

    @Override
    public ResponseEntity<Void> deleteCollectionModelImage(UUID collectionModelId, UUID imageId) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        collectionModelImagesService.deleteImage(currentUser.id(), collectionModelId, imageId);
        return ResponseEntity.noContent().build();
    }
}
