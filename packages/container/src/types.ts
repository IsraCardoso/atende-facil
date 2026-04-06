type ServiceLifetime = "singleton" | "transient";

type InjectionToken<TValue> = Readonly<{
  key: symbol;
  description: string;
  __value?: TValue;
}>;

type ProviderFactory<TValue> = (resolver: ContainerResolver) => TValue;

type ContainerResolver = Readonly<{
  resolve: <TValue>(token: InjectionToken<TValue>) => TValue;
}>;

type ContainerRegistration<TValue> = Readonly<{
  token: InjectionToken<TValue>;
  factory: ProviderFactory<TValue>;
  lifetime: ServiceLifetime;
}>;

type Container = ContainerResolver &
  Readonly<{
    registerSingleton: <TValue>(
      token: InjectionToken<TValue>,
      factory: ProviderFactory<TValue>,
    ) => void;
    registerTransient: <TValue>(
      token: InjectionToken<TValue>,
      factory: ProviderFactory<TValue>,
    ) => void;
    has: <TValue>(token: InjectionToken<TValue>) => boolean;
  }>;

export type {
  Container,
  ContainerRegistration,
  ContainerResolver,
  InjectionToken,
  ProviderFactory,
  ServiceLifetime,
};
