import * as React from "react";

import { NativeSelect } from "#/components/ui/native-select";

export interface SelectProps extends React.ComponentProps<typeof NativeSelect> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  return <NativeSelect ref={ref} {...props} />;
});

Select.displayName = "Select";

export { Select };
