import type { Core } from "@strapi/strapi";

async function readMainField(strapi: Core.Strapi, uid: string): Promise<string | null> {
  const configuration = await strapi.db.query('strapi::core-store').findOne({
    where: {
      key: `plugin_content_manager_configuration_content_types::${uid}`,
    },
  });

  if (configuration?.value && typeof configuration.value === 'string') {
    try {
      const value = JSON.parse(configuration.value);
      const configuredMainField = value?.settings?.mainField;
      if (typeof configuredMainField === 'string' && configuredMainField) {
        return configuredMainField;
      }
    } catch {
      // fall through to schema inference
    }
  }

  const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
  if (!contentType?.attributes) {
    return null;
  }

  const preferredFields = ['title', 'name', 'label'];
  for (const fieldName of preferredFields) {
    const attribute = contentType.attributes[fieldName];
    if (attribute && attribute.type === 'string') {
      return fieldName;
    }
  }

  const firstStringField = Object.entries(contentType.attributes).find(([, attribute]) => {
    return attribute && typeof attribute === 'object' && 'type' in attribute && attribute.type === 'string';
  });

  return firstStringField?.[0] ?? null;
}

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getWelcomeMessage() {
    return "Welcome to Enhanced Blocks Editor 🚀";
  },
  getMainField(uid: string) {
    return readMainField(strapi, uid);
  },
  async getContentTypes() {
    const contentTypes = strapi.contentTypes;
    const creatableContentTypes = Object.values(contentTypes).filter(
      (contentType) => contentType.pluginOptions?.["content-manager"]?.visible !== false
    );

    return Promise.all(
      creatableContentTypes.map(async (contentType) => ({
        uid: contentType.uid,
        info: {
          displayName: contentType.info.displayName,
          singularName: contentType.info.singularName,
          pluralName: contentType.info.pluralName,
          mainField: await readMainField(strapi, contentType.uid),
        },
      })),
    );
  },
});

export default service;
