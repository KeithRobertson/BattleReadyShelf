package com.keith.battlereadyshelf.collection;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollectionDto {
    private UUID id;
    private String name;
    private String description;
}
