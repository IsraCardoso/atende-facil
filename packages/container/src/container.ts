import type {
  Container,
  ContainerRegistration,
  ContainerResolver,
  InjectionToken,
  ProviderFactory,
} from "./types";

type InternalRegistration = Readonly<{
  lifetime: ContainerRegistration<unknown>["lifetime"];
  factory: ProviderFactory<unknown>;
}>;

function createUnregisteredTokenError(tokenDescription: string): Error {
  return new Error(`Dependência não registrada no container: ${tokenDescription}.`);
}

export function createToken<TValue>(description: string): InjectionToken<TValue> {
  return {
    key: Symbol(description),
    description,
  };
}

export function createContainer(): Container {
  const registrations = new Map<symbol, InternalRegistration>();
  const singletonInstances = new Map<symbol, unknown>();

  const resolver: ContainerResolver = {
    resolve<TValue>(token: InjectionToken<TValue>): TValue {
      const registration = registrations.get(token.key);

      if (!registration) {
        throw createUnregisteredTokenError(token.description);
      }

      if (registration.lifetime === "singleton") {
        if (!singletonInstances.has(token.key)) {
          const createdInstance = registration.factory(resolver);
          singletonInstances.set(token.key, createdInstance);
        }

        return singletonInstances.get(token.key) as TValue;
      }

      return registration.factory(resolver) as TValue;
    },
  };

  function register<TValue>(
    token: InjectionToken<TValue>,
    lifetime: InternalRegistration["lifetime"],
    factory: ProviderFactory<TValue>,
  ): void {
    registrations.set(token.key, {
      lifetime,
      factory: factory as ProviderFactory<unknown>,
    });
  }

  return {
    ...resolver,
    registerSingleton<TValue>(
      token: InjectionToken<TValue>,
      factory: ProviderFactory<TValue>,
    ): void {
      register(token, "singleton", factory);
    },
    registerTransient<TValue>(
      token: InjectionToken<TValue>,
      factory: ProviderFactory<TValue>,
    ): void {
      register(token, "transient", factory);
    },
    has<TValue>(token: InjectionToken<TValue>): boolean {
      return registrations.has(token.key);
    },
  };
}
