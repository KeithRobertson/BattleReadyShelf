package com.keith.battlereadyshelf.units;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UnitsControllerTest {

    private UnitsController unitsController;
    @Mock
    private UnitsService unitsService;

    @BeforeEach
    void setUp() {
        unitsController = new UnitsController(unitsService);
    }

    @Test
    void getUnits_getsUnitsFromService() {
        unitsController.getUnits();

        verify(unitsService).getUnits();
    }
}