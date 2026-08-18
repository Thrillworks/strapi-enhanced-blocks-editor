import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // Register as a custom field type stored as JSON (same as blocks content)
  strapi.customFields.register({
    name: 'enhanced-blocks-editor',
    plugin: 'enhanced-blocks-editor',
    type: 'json'
  });
};

export default register;
