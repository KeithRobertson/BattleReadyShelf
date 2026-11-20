package com.keith.battlereadyshelf.collectionexport;

import com.keith.battlereadyshelf.generated.api.CollectionExportApi;
import com.keith.battlereadyshelf.generated.model.CollectionExport;
import com.keith.battlereadyshelf.generated.model.CollectionExportRequest;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class CollectionExportController implements CollectionExportApi {
    private final CollectionExportService collectionExportService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<CollectionExport> exportArmyCollections(
            CollectionExportRequest collectionExportRequest) {
        var currentUser = authenticatedUserProvider.getCurrentUser();
        return ResponseEntity.ok(
                collectionExportService.export(currentUser.id(), collectionExportRequest));
    }
}
