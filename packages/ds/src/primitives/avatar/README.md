# Avatar

User/account image with graceful initials fallback, 4 status indicators, group stacking.

```tsx
import { Avatar, AvatarGroup, AvatarStatus } from "@ds/primitives/avatar";

<Avatar src="/me.png" alt="Adrien Chen" size="lg">
  <AvatarStatus variant="online" />
</Avatar>

<AvatarGroup max={3} size="sm">
  <Avatar src="/a.png" alt="A" />
  <Avatar src="/b.png" alt="B" />
  <Avatar src="/c.png" alt="C" />
  <Avatar src="/d.png" alt="D" />
</AvatarGroup>
```
