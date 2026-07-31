export default [
  {
    method: 'GET',
    path: '/',
    handler: 'controller.index',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/content-types',
    handler: 'controller.getContentTypes',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/get-main-field-by-uid',
    handler: 'controller.getMainField',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/get-main-field-by-uid/:uid',
    handler: 'controller.getMainField',
    config: {
      policies: [],
    },
  }
];
