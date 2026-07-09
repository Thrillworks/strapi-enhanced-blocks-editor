import { jsx, jsxs } from 'react/jsx-runtime';
import * as React from 'react';
import { unstable_useContentManagerContext } from '@strapi/strapi/admin';
import { Field, Flex } from '@strapi/design-system';
import { EnhancedBlocksEditor } from './EnhancedBlocksEditor';

const EnhancedBlocksInput = React.forwardRef<any, any>(({
  label,
  name,
  required = false,
  hint,
  labelAction,
  disabled = false,
  ...editorProps
}, forwardedRef) => {
  const id = React.useId();
  const context = unstable_useContentManagerContext();
  const form = context.form as any;

  // Get current value and error from form context
  const value = form.values?.[name];
  const error = form.errors?.[name];

  // The content-manager form is disabled in read-only contexts such as the
  // content history view. Respect both that and any per-field disabled prop.
  const isDisabled = disabled || Boolean(form.disabled);

  // Adapter to update form state directly via content manager context
  // This bridges the editor's onChange(name, value) signature to Strapi's form
  const handleChange = React.useCallback((_fieldName: string, newValue: any) => {
    if (isDisabled) {
      return;
    }
    if (typeof form.setValues === 'function') {
      form.setValues((currentValues: Record<string, unknown>) => ({
        ...currentValues,
        [name]: newValue,
      }));
    } else {
      form.setValues({
        ...form.values,
        [name]: newValue,
      });
    }
  }, [form, name, isDisabled]);

  return (
    <Field.Root
      id={id}
      name={name}
      hint={hint}
      error={error}
      required={required}
    >
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Field.Label action={labelAction}>
          {label}
        </Field.Label>
        <EnhancedBlocksEditor
          name={name}
          error={error}
          ref={forwardedRef}
          value={value}
          onChange={handleChange}
          disabled={isDisabled}
          {...editorProps}
        />
        <Field.Hint />
        <Field.Error />
      </Flex>
    </Field.Root>
  );
});

EnhancedBlocksInput.displayName = 'EnhancedBlocksInput';

const MemoizedEnhancedBlocksInput = React.memo(EnhancedBlocksInput);

export { MemoizedEnhancedBlocksInput as EnhancedBlocksInput };
