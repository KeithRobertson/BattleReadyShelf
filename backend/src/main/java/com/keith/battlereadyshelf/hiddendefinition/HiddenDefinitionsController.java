package com.keith.battlereadyshelf.hiddendefinition;

import com.keith.battlereadyshelf.generated.api.HiddenDefinitionsApi;
import com.keith.battlereadyshelf.generated.model.SetDefinitionsHiddenRequest;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/**
 * What the caller does not want offered to them. Needs no role beyond being signed in: a hide is
 * scoped to the caller in {@link HiddenDefinitionService} and changes nothing anyone else can see.
 */
@RestController
@RequiredArgsConstructor
public class HiddenDefinitionsController implements HiddenDefinitionsApi {

    private final HiddenDefinitionService hiddenDefinitionService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<Void> setDefinitionsHidden(
            SetDefinitionsHiddenRequest setDefinitionsHiddenRequest) {
        hiddenDefinitionService.setHidden(
                authenticatedUserProvider.getCurrentUser().id(),
                setDefinitionsHiddenRequest.getDefinitionType(),
                setDefinitionsHiddenRequest.getDefinitionIds(),
                setDefinitionsHiddenRequest.getHidden());
        return ResponseEntity.noContent().build();
    }
}
