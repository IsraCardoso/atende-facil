# ui — Design system (shadcn v4)

Import components by subpath (tree-shake friendly):

```tsx
import { Button } from 'ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'ui/card';
```

Global styles in `apps/web`:

```css
@import 'ui/globals.css';
```

Ported from OmniChat `backoffice-app` (new-york, OKLCH tokens).
