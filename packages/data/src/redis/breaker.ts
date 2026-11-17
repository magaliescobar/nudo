/**
 * Circuit breaker (R03). Tras `failureThreshold` fallos seguidos se abre: las operaciones
 * fallan al instante durante `cooldownMs` sin tocar la red. Luego deja pasar una prueba
 * (half-open); si sale bien se cierra, si falla vuelve a abrirse.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 5_000,
    private readonly now: () => number = Date.now,
  ) {}

  get state(): "closed" | "open" | "half-open" {
    if (this.openedAt === null) return "closed";
    return this.now() - this.openedAt >= this.cooldownMs ? "half-open" : "open";
  }

  canRequest(): boolean {
    return this.state !== "open";
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.state === "half-open" || this.failures >= this.failureThreshold) {
      this.openedAt = this.now();
    }
  }
}
