import type { InputHTMLAttributes } from 'react';

/**
 * An on/off setting. Safari draws its own iPhone switch, with the tap you can
 * feel; elsewhere the stylesheet draws one.
 */
export function Switch(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'role'>) {
  return <input type="checkbox" role="switch" className="switch" {...{ switch: '' }} {...props} />;
}
