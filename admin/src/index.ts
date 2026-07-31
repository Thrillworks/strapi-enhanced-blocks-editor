import * as yup from 'yup';
import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { EmbeddedEntryTypesSelect } from './components/EmbeddedEntryTypesSelect';
import { getTranslation } from './utils/getTranslation';
import { parseEmbeddedEntryBlockTypes } from './utils/contentTypes';

function registerEmbeddedEntryTypesSelect(getPlugin: (pluginId: string) => any) {
  const components = getPlugin('content-type-builder')?.apis?.forms?.components;

  if (!components || typeof components.add !== 'function') {
    return;
  }

  components.add({
    id: 'embedded-entry-types-select',
    component: EmbeddedEntryTypesSelect,
  });
}

export default {
  register(app: any) {
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      name: PLUGIN_ID,
    });

    // Register as a custom field type - this gives us full control over
    // the editor without inheriting Strapi's native blocks schema validation
    app.customFields.register({
      name: PLUGIN_ID,
      pluginId: PLUGIN_ID,
      type: 'json', // Blocks content is stored as JSON
      intlLabel: {
        id: getTranslation('plugin.name'),
        defaultMessage: 'Enhanced Blocks Editor',
      },
      icon: PluginIcon,
      intlDescription: {
        id: getTranslation('plugin.description'),
        defaultMessage: 'Rich text blocks editor with embedded entries support',
      },
      components: {
        Input: async () =>
          import('./components/EnhancedBlocksInput').then(
            (module) => ({ default: module.EnhancedBlocksInput })
          ),
      },
      options: {
        advanced: [
          {
            sectionTitle: {
              id: getTranslation('plugin.options.advanced.embeds.title'),
              defaultMessage: 'Embedded entries and assets',
            },
            items: [
              {
                intlLabel: {
                  id: getTranslation('plugin.options.advanced.allow_embedded_entries'),
                  defaultMessage: 'Allow embedded entries',
                },
                description: {
                  id: getTranslation('plugin.options.advanced.allow_embedded_entries.description'),
                  defaultMessage: 'Enable embedding other collection entries in this field',
                },
                name: 'options.allow_embedded_entries' as any,
                type: 'checkbox',
                defaultValue: true,
              },
              {
                intlLabel: {
                  id: getTranslation('plugin.options.advanced.embeds.blockEntryTypes'),
                  defaultMessage: 'Allowed types for embedded entry blocks',
                },
                description: {
                  id: getTranslation('plugin.options.advanced.embeds.description'),
                  defaultMessage:
                    'Choose which collection types authors can embed. At least one type is required when embedded entries are allowed.',
                },
                name: 'options.embedded-entry-block-types' as any,
                type: 'embedded-entry-types-select' as any,
                size: 12,
              },
              {
                intlLabel: {
                  id: getTranslation('plugin.options.advanced.enable_embedded_entry_data_in_response'),
                  defaultMessage: 'Embedded entry data in response',
                },
                description: {
                  id: getTranslation('plugin.options.advanced.enable_embedded_entry_data_in_response.description'),
                  defaultMessage: 'Include embedded entry data in the API response',
                },
                name: 'options.enable_embedded_entry_data_in_response' as any,
                type: 'checkbox',
                defaultValue: true,
                size: 12,
              },
            ],
          },
          {
            sectionTitle: {
              id: 'global.settings',
              defaultMessage: 'Settings',
            },
            items: [
              {
                name: 'required',
                type: 'checkbox',
                intlLabel: {
                  id: 'content-type-builder.form.attribute.item.requiredField',
                  defaultMessage: 'Required field',
                },
                description: {
                  id: 'content-type-builder.form.attribute.item.requiredField.description',
                  defaultMessage: "You won't be able to create an entry if this field is empty",
                },
              },
              {
                name: 'private',
                type: 'checkbox',
                intlLabel: {
                  id: 'content-type-builder.form.attribute.item.privateField',
                  defaultMessage: 'Private field',
                },
                description: {
                  id: 'content-type-builder.form.attribute.item.privateField.description',
                  defaultMessage: 'This field will not show up in the API response',
                },
              },
            ],
          },
        ],
        validator: () => ({
          'embedded-entry-block-types': yup
            .mixed()
            .test(
              'at-least-one-when-allowed',
              {
                id: getTranslation('plugin.options.advanced.embeds.validation.min'),
                defaultMessage:
                  'Select at least one collection type when embedded entries are allowed.',
              },
              function (value) {
                const allowEmbeddedEntries = this.parent?.allow_embedded_entries ?? true;
                if (!allowEmbeddedEntries) {
                  return true;
                }

                return parseEmbeddedEntryBlockTypes(value as string | string[] | null | undefined)
                  .length > 0;
              },
            ),
        }),
      },
    });
  },

  bootstrap({ getPlugin }: { getPlugin: (pluginId: string) => any }) {
    registerEmbeddedEntryTypesSelect(getPlugin);
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
