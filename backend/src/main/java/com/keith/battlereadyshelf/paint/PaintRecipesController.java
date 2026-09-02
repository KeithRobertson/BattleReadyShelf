package com.keith.battlereadyshelf.paint;

import com.keith.battlereadyshelf.generated.api.PaintRecipesApi;
import com.keith.battlereadyshelf.generated.model.PaintRecipe;
import com.keith.battlereadyshelf.generated.model.SavePaintRecipeRequest;
import com.keith.battlereadyshelf.security.AuthenticatedUserProvider;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PaintRecipesController implements PaintRecipesApi {

    private final PaintRecipeService paintRecipeService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @Override
    public ResponseEntity<List<PaintRecipe>> getPaintRecipes(UUID armyCollectionId) {
        return ResponseEntity.ok(
                paintRecipeService.getPaintRecipes(
                        authenticatedUserProvider.getCurrentUser().id(), armyCollectionId));
    }

    /** 204 means the recipe was empty, so any existing one at that scope was removed instead. */
    @Override
    public ResponseEntity<PaintRecipe> savePaintRecipe(
            SavePaintRecipeRequest savePaintRecipeRequest) {
        var saved =
                paintRecipeService.savePaintRecipe(
                        authenticatedUserProvider.getCurrentUser().id(), savePaintRecipeRequest);
        return saved == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(saved);
    }
}
