package com.keith.battlereadyshelf.paint;

import static com.keith.battlereadyshelf.paint.PaintMapper.trimToNull;

import com.keith.battlereadyshelf.armycollection.ArmyCollectionEntity;
import com.keith.battlereadyshelf.armycollection.ArmyCollectionRepository;
import com.keith.battlereadyshelf.collectionmodel.CollectionModelRepository;
import com.keith.battlereadyshelf.error.BadRequestException;
import com.keith.battlereadyshelf.error.NotFoundException;
import com.keith.battlereadyshelf.generated.model.PaintRecipe;
import com.keith.battlereadyshelf.generated.model.PaintRecipeEntry;
import com.keith.battlereadyshelf.generated.model.SavePaintRecipeRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Reads and writes the paint recipes attached to a collection, its model types and its individual
 * models.
 *
 * <p>Recipes are addressed by what they are attached to rather than by id, because at most one
 * exists per target. That makes saving an upsert and spares the client from tracking whether a
 * recipe already existed - it simply sends the state the editor is in.
 *
 * <p>Access follows the collection: anyone who may view the collection may read its recipes, since a
 * collection shared with other users but whose recipes were hidden would be missing the part other
 * painters most want to see. Only the owner may write.
 */
@Service
@RequiredArgsConstructor
public class PaintRecipeService {

    /** How many steps a card shows when the client has not said which ones it wants. */
    private static final int DEFAULT_CARD_SWATCHES = 3;

    private final PaintRecipeRepository paintRecipeRepository;
    private final PaintRepository paintRepository;
    private final ArmyCollectionRepository armyCollectionRepository;
    private final CollectionModelRepository collectionModelRepository;

    /**
     * Every recipe applying anywhere in one collection, at any scope, in one query. The client
     * resolves what each model shows from this rather than asking per model, which would be a
     * request per card on a page that routinely shows dozens.
     */
    public List<PaintRecipe> getPaintRecipes(UUID currentUserId, UUID armyCollectionId) {
        requireViewableCollection(currentUserId, armyCollectionId);
        return paintRecipeRepository.findAllByArmyCollectionId(armyCollectionId).stream()
                .map(PaintRecipeService::toDto)
                .toList();
    }

    /**
     * Creates or replaces the recipe at one scope.
     *
     * <p>An empty recipe - no paints and no notes - deletes rather than storing a blank row, so
     * clearing the editor and saving is how a user removes one. Returning null tells the controller
     * to answer 204.
     */
    @Transactional
    public PaintRecipe savePaintRecipe(UUID currentUserId, SavePaintRecipeRequest request) {
        var collection = requireOwnedCollection(currentUserId, request.getArmyCollectionId());
        var scope = requireScope(request.getScope());
        var target = resolveTarget(collection, scope, request);

        var notes = trimToNull(request.getNotes());
        var entries = request.getPaints() == null ? List.<PaintRecipeEntry>of() : request.getPaints();

        var existing = findExisting(target);
        if (entries.isEmpty() && notes == null) {
            existing.ifPresent(paintRecipeRepository::delete);
            return null;
        }

        var recipe =
                existing.orElseGet(
                        () ->
                                PaintRecipeEntity.builder()
                                        .scope(target.scope())
                                        .armyCollectionId(target.armyCollectionId())
                                        .modelDefinitionId(target.modelDefinitionId())
                                        .collectionModelId(target.collectionModelId())
                                        .build());
        recipe.setNotes(notes);

        if (existing.isPresent()) {
            // The old rows are deleted and the new ones inserted in the same flush, and Hibernate
            // orders inserts first - so the new step at position 0 would collide with the old row
            // still holding position 0. Emptying the recipe and flushing that on its own frees the
            // positions before anything claims them again.
            recipe.replacePaints(List.of());
            paintRecipeRepository.saveAndFlush(recipe);
        }
        recipe.replacePaints(toEntities(entries));

        // Flushed rather than merely saved because the response is built from this same instance:
        // a plain save only queues the insert, so the @UpdateTimestamp generator has not run yet
        // and the timestamp would still be unset when it is read back below.
        return toDto(paintRecipeRepository.saveAndFlush(recipe));
    }

    /**
     * Where a recipe hangs, validated against its scope so a request cannot describe a target the
     * scope does not have.
     *
     * <p>A MODEL recipe carries no model definition even though its model has one: the model's own
     * id already identifies it, and storing the definition too would be a second copy of a fact that
     * can change when the model's type is changed.
     */
    private record RecipeTarget(
            PaintRecipeScope scope,
            UUID armyCollectionId,
            UUID modelDefinitionId,
            UUID collectionModelId) {}

    private RecipeTarget resolveTarget(
            ArmyCollectionEntity collection,
            PaintRecipeScope scope,
            SavePaintRecipeRequest request) {
        return switch (scope) {
            case COLLECTION -> {
                requireAbsent(request.getModelDefinitionId(), "modelDefinitionId", scope);
                requireAbsent(request.getCollectionModelId(), "collectionModelId", scope);
                yield new RecipeTarget(scope, collection.getId(), null, null);
            }
            case MODEL_TYPE -> {
                requireAbsent(request.getCollectionModelId(), "collectionModelId", scope);
                var modelDefinitionId =
                        requirePresent(request.getModelDefinitionId(), "modelDefinitionId", scope);
                requireTypeUsedInCollection(collection.getId(), modelDefinitionId);
                yield new RecipeTarget(scope, collection.getId(), modelDefinitionId, null);
            }
            case MODEL -> {
                requireAbsent(request.getModelDefinitionId(), "modelDefinitionId", scope);
                var collectionModelId =
                        requirePresent(request.getCollectionModelId(), "collectionModelId", scope);
                requireModelInCollection(collection.getId(), collectionModelId);
                yield new RecipeTarget(scope, collection.getId(), null, collectionModelId);
            }
        };
    }

    private Optional<PaintRecipeEntity> findExisting(RecipeTarget target) {
        return switch (target.scope()) {
            case COLLECTION ->
                    paintRecipeRepository.findByArmyCollectionIdAndScope(
                            target.armyCollectionId(), PaintRecipeScope.COLLECTION);
            case MODEL_TYPE ->
                    paintRecipeRepository.findByArmyCollectionIdAndModelDefinitionId(
                            target.armyCollectionId(), target.modelDefinitionId());
            case MODEL -> paintRecipeRepository.findByCollectionModelId(target.collectionModelId());
        };
    }

    /**
     * Resolves the requested paints in one query and rebuilds the entry list from scratch.
     *
     * <p>Position comes from the order they arrive in rather than from the client, so a reorder is
     * just a save of the new order and there is no way to send a duplicate or missing position.
     */
    private List<PaintRecipePaintEntity> toEntities(List<PaintRecipeEntry> entries) {
        var paintIds = entries.stream().map(PaintRecipeEntry::getPaintId).distinct().toList();
        Map<UUID, PaintEntity> paintsById =
                paintRepository.findAllById(paintIds).stream()
                        .collect(Collectors.toMap(PaintEntity::getId, Function.identity()));

        var built = new ArrayList<PaintRecipePaintEntity>(entries.size());
        for (var index = 0; index < entries.size(); index++) {
            var entry = entries.get(index);
            var paint = paintsById.get(entry.getPaintId());
            if (paint == null) {
                throw new NotFoundException("Paint not found: " + entry.getPaintId());
            }
            built.add(
                    PaintRecipePaintEntity.builder()
                            .paint(paint)
                            .position(index)
                            .stepLabel(trimToNull(entry.getStepLabel()))
                            .note(trimToNull(entry.getNote()))
                            // A client that has not been told about the choice still gets a
                            // sensible card: the first few steps are where a recipe's defining
                            // colours usually are.
                            .showOnCard(
                                    entry.getShowOnCard() == null
                                            ? index < DEFAULT_CARD_SWATCHES
                                            : entry.getShowOnCard())
                            .build());
        }
        return built;
    }

    private ArmyCollectionEntity requireViewableCollection(UUID currentUserId, UUID armyCollectionId) {
        var collection = requireCollection(armyCollectionId);
        if (!Boolean.TRUE.equals(collection.getIsPublic())
                && !collection.getUserId().equals(currentUserId)) {
            throw new NotFoundException("Army collection not found: " + armyCollectionId);
        }
        return collection;
    }

    private ArmyCollectionEntity requireOwnedCollection(UUID currentUserId, UUID armyCollectionId) {
        var collection = requireCollection(armyCollectionId);
        if (!collection.getUserId().equals(currentUserId)) {
            throw new NotFoundException("Army collection not found: " + armyCollectionId);
        }
        return collection;
    }

    private ArmyCollectionEntity requireCollection(UUID armyCollectionId) {
        if (armyCollectionId == null) {
            throw new BadRequestException("A paint recipe needs an army collection.");
        }
        return armyCollectionRepository
                .findById(armyCollectionId)
                .orElseThrow(
                        () -> new NotFoundException("Army collection not found: " + armyCollectionId));
    }

    private void requireModelInCollection(UUID armyCollectionId, UUID collectionModelId) {
        var model =
                collectionModelRepository
                        .findById(collectionModelId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Collection model not found: " + collectionModelId));
        if (!model.getArmyCollectionId().equals(armyCollectionId)) {
            throw new BadRequestException(
                    "Collection model " + collectionModelId + " is not in this collection.");
        }
    }

    /**
     * A model-type recipe is only meaningful for a type the collection actually contains - the
     * "groups" it would show against are derived from the collection's models, so a recipe for an
     * absent type could never be displayed.
     */
    private void requireTypeUsedInCollection(UUID armyCollectionId, UUID modelDefinitionId) {
        var used =
                collectionModelRepository.existsByArmyCollectionIdAndModelDefinitionId(
                        armyCollectionId, modelDefinitionId);
        if (!used) {
            throw new BadRequestException(
                    "This collection has no models of type " + modelDefinitionId + ".");
        }
    }

    private static PaintRecipeScope requireScope(
            com.keith.battlereadyshelf.generated.model.PaintRecipeScope scope) {
        if (scope == null) {
            throw new BadRequestException("A paint recipe needs a scope.");
        }
        return PaintRecipeScope.valueOf(scope.getValue());
    }

    private static UUID requirePresent(UUID value, String field, PaintRecipeScope scope) {
        if (value == null) {
            throw new BadRequestException("A " + scope.name() + " paint recipe needs a " + field + ".");
        }
        return value;
    }

    private static void requireAbsent(UUID value, String field, PaintRecipeScope scope) {
        if (value != null) {
            throw new BadRequestException(
                    "A " + scope.name() + " paint recipe must not carry a " + field + ".");
        }
    }

    private static PaintRecipe toDto(PaintRecipeEntity entity) {
        var paints = entity.getPaints().stream().map(PaintRecipeService::toDto).toList();

        return new PaintRecipe(
                        com.keith.battlereadyshelf.generated.model.PaintRecipeScope.valueOf(
                                entity.getScope().name()),
                        paints)
                .id(entity.getId())
                .armyCollectionId(entity.getArmyCollectionId())
                .modelDefinitionId(entity.getModelDefinitionId())
                .collectionModelId(entity.getCollectionModelId())
                .notes(entity.getNotes())
                // Tolerated as absent rather than assumed present: the field is optional on the
                // DTO, and failing a save the user has already made because a timestamp is missing
                // would lose their work over a detail they cannot see.
                .updatedAt(
                        entity.getUpdatedAt() == null
                                ? null
                                : entity.getUpdatedAt().atOffset(ZoneOffset.UTC));
    }

    private static PaintRecipeEntry toDto(PaintRecipePaintEntity entity) {
        return new PaintRecipeEntry(entity.getPaint().getId())
                // Embedded rather than looked up by the client: a viewer of a public collection
                // cannot fetch paints personal to its owner, so the recipe has to carry them.
                .paint(PaintMapper.toDtoWithoutUsage(entity.getPaint()))
                .stepLabel(entity.getStepLabel())
                .note(entity.getNote())
                .showOnCard(entity.isShowOnCard());
    }
}
