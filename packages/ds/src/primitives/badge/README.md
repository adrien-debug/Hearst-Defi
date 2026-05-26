# Badge

Compact status / category tag. 8 variants, 3 sizes, optional icon / count bubble / dot.

```tsx
import { Badge } from "@ds/primitives/badge";

<Badge variant="success">Live</Badge>
<Badge variant="warning" icon={<AlertTriangle size={12} />}>Pending</Badge>
<Badge count={3}>Inbox</Badge>
<Badge variant="dot">Online</Badge>
```
