import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('enhanced-blocks-editor')
      .service('service')
      .getWelcomeMessage();
  },
  getContentTypes(ctx) {
    return strapi
      .plugin('enhanced-blocks-editor')
      .service('service')
      .getContentTypes()
      .then((contentTypes) => {
        ctx.body = contentTypes;
      });
  },
  async getMainField(ctx) {
    const uid = ctx.params.uid ?? ctx.query.uid;
    if (!uid) {
      ctx.throw(400, 'UID is required');
    }
    ctx.body = await strapi
      .plugin('enhanced-blocks-editor')
      .service('service')
      .getMainField(uid);
  }
});

export default controller;
