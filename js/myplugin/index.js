import { Plugin } from 'ckeditor5/src/core';
import { Widget, toWidget, viewToModelPositionOutsideModelElement } from 'ckeditor5/src/widget';
import { Model, addListToDropdown, createDropdown } from 'ckeditor5/src/ui';
import { Collection } from 'ckeditor5/src/utils';

/**
 * Replace `MyPlugin` by your own plugin name.
 */
class MyPlugin extends Plugin {
  static get requires() {
    return [MyPluginEditing, MyPluginUI];
  }

  static get pluginName() {
    return 'MyPlugin';
  }
}

class MyPluginEditing extends Plugin {
  static get requires() {
    return [Widget];
  }

  init() {
    console.log('MyPluginEditing#init() got called');

    this._defineSchema();
    this._defineConverters();

    this.editor.commands.add('MyPlugin', new MyPluginCommand(this.editor));

    this.editor.editing.mapper.on(
      'viewToModelPosition',
      viewToModelPositionOutsideModelElement(this.editor.model, viewElement => viewElement.hasClass('MyPlugin'))
    );

    this.editor.config.define('MyPluginConfig', {
      types: ['date', 'first name', 'surname']
    });
  }

  _defineSchema() {
    const schema = this.editor.model.schema;

    schema.register('MyPlugin', {
      // Behaves like a self-contained inline object (e.g. an inline image)
      // allowed in places where $text is allowed (e.g. in paragraphs).
      // The inline widget can have the same attributes as text (for example linkHref, bold).
      inheritAllFrom: '$inlineObject',

      // The MyPlugin can have many types, like date, name, surname, etc:
      allowAttributes: ['name']
    });
  }

  _defineConverters() {
    const conversion = this.editor.conversion;

    conversion.for('upcast').elementToElement({
      view: {
        name: 'span',
        classes: ['MyPlugin']
      },
      model: (viewElement, { writer: modelWriter }) => {
        // Extract the "name" from "{name}".
        const name = viewElement.getChild(0).data.slice(1, -1);

        return modelWriter.createElement('MyPlugin', { name });
      }
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'MyPlugin',
      view: (modelItem, { writer: viewWriter }) => {
        const widgetElement = createMyPluginView(modelItem, viewWriter);

        // Enable widget handling on a MyPlugin element inside the editing view.
        return toWidget(widgetElement, viewWriter);
      }
    });

    conversion.for('dataDowncast').elementToElement({
      model: 'MyPlugin',
      view: (modelItem, { writer: viewWriter }) => createMyPluginView(modelItem, viewWriter)
    });

    // Helper method for both downcast converters.
    function createMyPluginView(modelItem, viewWriter) {
      const name = modelItem.getAttribute('name');

      const MyPluginView = viewWriter.createContainerElement('span', {
        class: 'MyPlugin'
      });

      // Insert the MyPlugin name (as a text).
      const innerText = viewWriter.createText('{' + name + '}');
      viewWriter.insert(viewWriter.createPositionAt(MyPluginView, 0), innerText);

      return MyPluginView;
    }
  }
}

class MyPluginUI extends Plugin {
  init() {
    const editor = this.editor;
    const t = editor.t;
    const MyPluginNames = editor.config.get('MyPluginConfig.types');

    // The "MyPlugin" dropdown must be registered among the UI components of the editor
    // to be displayed in the toolbar.
    editor.ui.componentFactory.add('MyPlugin', locale => {
      const dropdownView = createDropdown(locale);

      // Populate the list in the dropdown with items.
      addListToDropdown(dropdownView, getDropdownItemsDefinitions(MyPluginNames));

      dropdownView.buttonView.set({
        label: Drupal.t('MyPlugin'),
        tooltip: true,
        withText: true
      });

      // Disable the MyPlugin button when the command is disabled.
      const command = editor.commands.get('MyPlugin');
      dropdownView.bind('isEnabled').to(command);

      // Execute the command when the dropdown item is clicked (executed).
      this.listenTo(dropdownView, 'execute', evt => {
        editor.execute('MyPlugin', { value: evt.source.commandParam });
        editor.editing.view.focus();
      });

      return dropdownView;
    });
  }
}

class MyPluginCommand extends Command {
  execute({ value }) {
    const editor = this.editor;
    const selection = editor.model.document.selection;

    editor.model.change(writer => {
      // Create a <MyPlugin> element with the "name" attribute (and all the selection attributes)...
      const MyPlugin = writer.createElement('MyPlugin', {
        ...Object.fromEntries(selection.getAttributes()),
        name: value
      });

      // ... and insert it into the document. Put the selection on the inserted element.
      editor.model.insertObject(MyPlugin, null, null, { setSelection: 'on' });
    });
  }

  refresh() {
    const model = this.editor.model;
    const selection = model.document.selection;

    const isAllowed = model.schema.checkChild(selection.focus.parent, 'MyPlugin');

    this.isEnabled = isAllowed;
  }
}

function getDropdownItemsDefinitions(MyPluginNames) {
  const itemDefinitions = new Collection();

  for (const name of MyPluginNames) {
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

export default {
  MyPlugin,
}