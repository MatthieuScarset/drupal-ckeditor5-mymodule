import { Command, Plugin } from 'ckeditor5/src/core';
import { Widget, toWidget, viewToModelPositionOutsideModelElement } from 'ckeditor5/src/widget';
import { Model, addListToDropdown, createDropdown } from 'ckeditor5/src/ui';
import { Collection } from 'ckeditor5/src/utils';

/**
 * Replace `MyPlugin` by your own plugin name.
 * Replace `myplugin` by your own class name.
 */
class MyPlugin extends Plugin {
  static get requires() {
    return [MyPluginEditing, MyPluginUI];
  }
}

class MyPluginCommand extends Command {
  execute({ value }) {
    const editor = this.editor;
    const selection = editor.model.document.selection;

    editor.model.change(writer => {
      // Create a <myplugin> element with the "name" attribute (and all the selection attributes)...
      const myplugin = writer.createElement('myplugin', {
        ...Object.fromEntries(selection.getAttributes()),
        name: value
      });

      // ... and insert it into the document. Put the selection on the inserted element.
      editor.model.insertObject(myplugin, null, null, { setSelection: 'on' });
    });
  }

  refresh() {
    const model = this.editor.model;
    const selection = model.document.selection;

    const isAllowed = model.schema.checkChild(selection.focus.parent, 'myplugin');

    this.isEnabled = isAllowed;
  }
}

class MyPluginUI extends Plugin {
  init() {
    const editor = this.editor;
    const t = editor.t;
    const mypluginNames = editor.config.get('mypluginConfig.types');

    // The "myplugin" dropdown must be registered among the UI components of the editor
    // to be displayed in the toolbar.
    editor.ui.componentFactory.add('myplugin', locale => {
      const dropdownView = createDropdown(locale);

      // Populate the list in the dropdown with items.
      addListToDropdown(dropdownView, getDropdownItemsDefinitions(mypluginNames));

      dropdownView.buttonView.set({
        // The t() function helps localize the editor. All strings enclosed in t() can be
        // translated and change when the language of the editor changes.
        label: t('MyPlugin'),
        tooltip: true,
        withText: true
      });

      // Disable the myplugin button when the command is disabled.
      const command = editor.commands.get('myplugin');
      dropdownView.bind('isEnabled').to(command);

      // Execute the command when the dropdown item is clicked (executed).
      this.listenTo(dropdownView, 'execute', evt => {
        editor.execute('myplugin', { value: evt.source.commandParam });
        editor.editing.view.focus();
      });

      return dropdownView;
    });
  }
}

function getDropdownItemsDefinitions(mypluginNames) {
  const itemDefinitions = new Collection();

  for (const name of mypluginNames) {
    const definition = {
      type: 'button',
      model: new Model({
        commandParam: name,
        label: name,
        withText: true
      })
    };

    // Add the item definition to the collection.
    itemDefinitions.add(definition);
  }

  return itemDefinitions;
}

class MyPluginEditing extends Plugin {
  static get requires() {
    return [Widget];
  }

  init() {
    console.log('MyPluginEditing#init() got called');

    this._defineSchema();
    this._defineConverters();

    this.editor.commands.add('myplugin', new MyPluginCommand(this.editor));

    this.editor.editing.mapper.on(
      'viewToModelPosition',
      viewToModelPositionOutsideModelElement(this.editor.model, viewElement => viewElement.hasClass('myplugin'))
    );
    this.editor.config.define('mypluginConfig', {
      types: ['date', 'first name', 'surname']
    });
  }

  _defineSchema() {
    const schema = this.editor.model.schema;

    schema.register('myplugin', {
      // Behaves like a self-contained inline object (e.g. an inline image)
      // allowed in places where $text is allowed (e.g. in paragraphs).
      // The inline widget can have the same attributes as text (for example linkHref, bold).
      inheritAllFrom: '$inlineObject',

      // The myplugin can have many types, like date, name, surname, etc:
      allowAttributes: ['name']
    });
  }

  _defineConverters() {
    const conversion = this.editor.conversion;

    conversion.for('upcast').elementToElement({
      view: {
        name: 'span',
        classes: ['myplugin']
      },
      model: (viewElement, { writer: modelWriter }) => {
        // Extract the "name" from "{name}".
        const name = viewElement.getChild(0).data.slice(1, -1);

        return modelWriter.createElement('myplugin', { name });
      }
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'myplugin',
      view: (modelItem, { writer: viewWriter }) => {
        const widgetElement = createMyPluginView(modelItem, viewWriter);

        // Enable widget handling on a myplugin element inside the editing view.
        return toWidget(widgetElement, viewWriter);
      }
    });

    conversion.for('dataDowncast').elementToElement({
      model: 'myplugin',
      view: (modelItem, { writer: viewWriter }) => createMyPluginView(modelItem, viewWriter)
    });

    // Helper method for both downcast converters.
    function createMyPluginView(modelItem, viewWriter) {
      const name = modelItem.getAttribute('name');

      const mypluginView = viewWriter.createContainerElement('span', {
        class: 'myplugin'
      });

      // Insert the myplugin name (as a text).
      const innerText = viewWriter.createText('{' + name + '}');
      viewWriter.insert(viewWriter.createPositionAt(mypluginView, 0), innerText);

      return mypluginView;
    }
  }
}

export default {
  MyPlugin,
}