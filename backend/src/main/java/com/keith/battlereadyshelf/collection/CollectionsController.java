package com.keith.battlereadyshelf.collection;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/collections")
public class CollectionsController {

    @GetMapping
    public ResponseEntity<List<CollectionDto>> getCollections() {
        List<CollectionDto> list = List.of(
                new CollectionDto(UUID.fromString("11111111-1111-1111-1111-111111111111"), "Starter Collection", "A static example collection")
        );
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<CollectionDto> createCollection(@RequestBody CollectionDto dto) {
        CollectionDto created = new CollectionDto(UUID.randomUUID(), dto.getName(), dto.getDescription());
        return ResponseEntity.status(201).body(created);
    }
}
