package com.keith.battlereadyshelf.paint;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaintRecipeRepository extends JpaRepository<PaintRecipeEntity, UUID> {
    /**
     * Every recipe that applies anywhere in one collection, at any scope. The collection page
     * resolves what each model shows from this one result rather than asking per model.
     */
    List<PaintRecipeEntity> findAllByArmyCollectionId(UUID armyCollectionId);

    Optional<PaintRecipeEntity> findByArmyCollectionIdAndScope(
            UUID armyCollectionId, PaintRecipeScope scope);

    Optional<PaintRecipeEntity> findByArmyCollectionIdAndModelDefinitionId(
            UUID armyCollectionId, UUID modelDefinitionId);

    Optional<PaintRecipeEntity> findByCollectionModelId(UUID collectionModelId);

    @Query(
            "SELECT count(e) FROM PaintRecipePaintEntity e WHERE e.paint.id = :paintId")
    long countUsagesOfPaint(UUID paintId);

    /** Usage for every paint in one query, so listing a catalogue does not fan out into a count each. */
    @Query(
            "SELECT e.paint.id, count(e) FROM PaintRecipePaintEntity e GROUP BY e.paint.id")
    List<Object[]> countUsagesByPaint();
}
