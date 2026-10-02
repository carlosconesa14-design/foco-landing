import { setLuck } from "../src/game/economy";

// Sin ventas virales por defecto: los tests comprueban cantidades exactas.
setLuck(() => 1);
