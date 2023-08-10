import { Plugin } from 'ckeditor5/src/core';

/**
 * Replace `MyPlugin` by your own plugin name.
 */
class MyPlugin extends Plugin {
  init() {
    console.log('MyPluginEditing#init() got called');
  }
}

export default {
  MyPlugin,
}