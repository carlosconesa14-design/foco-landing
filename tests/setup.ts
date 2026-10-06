import { afterEach, beforeEach } from "vitest";
import { setLuck } from "../src/game/economy";

// Sin ventas virales por defecto: los tests comprueban cantidades exactas.
setLuck(() => 1);

// Los tests de ritmo simulan horas de juego y bloquean el proceso decenas de segundos. Entre test y
// test se cede el turno al bucle de eventos para que el proceso de tests reciba las respuestas de
// Vitest a tiempo; si no, a veces salta un falso «Timeout calling onTaskUpdate» y el CI falla.
beforeEach(() => new Promise<void>((resolve) => setImmediate(resolve)));
afterEach(() => new Promise<void>((resolve) => setImmediate(resolve)));
