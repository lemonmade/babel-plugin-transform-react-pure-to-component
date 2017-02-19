export default function babelPluginTransformReactPureToComponent({types: t}) {
  return {
    visitor: {
      ImportDeclaration(path, state) {
        if (!path.get('source').isStringLiteral({value: 'react'})) { return; }

        path.get('specifiers').forEach((specifier) => {
          if (specifier.isImportDefaultSpecifier()) {
            state.defaultImport = specifier;
          } else if (specifier.isImportNamespaceSpecifier()) {
            state.namespaceImport = specifier;
          } else if (isComponentImport(specifier)) {
            state.namedImport = specifier;
          } else {
            state.siblingNamedImport = specifier;
          }
        });
      },
      ClassDeclaration(path, state) {
        const superClass = path.get('superClass');

        if (superClass.isMemberExpression()) {
          const superClassObject = superClass.get('object');
          
          if (
            !superClassObject.isIdentifier() ||
            path.scope.getBinding(superClassObject.node.name) == null ||
            !isReactImport(path.scope.getBinding(superClassObject.node.name).path) ||
            !superClass.get('property').isIdentifier({name: 'PureComponent'})
          ) { return; }

          superClass.replaceWith(resolveLocalComponentIdentifier(state, t));
        }

        if (superClass.isIdentifier()) {
          if (!path.scope.hasBinding(superClass.node.name)) { return; }

          const superClassName = superClass.node.name;
          const importBinding = path.scope.getBinding(superClassName);

          if (importBinding == null) {
            return;
          }

          const importPath = importBinding.path;

          if (
            !importPath.isImportSpecifier() ||
            !importPath.parentPath.get('source').isStringLiteral({value: 'react'}) ||
            !importPath.get('imported').isIdentifier({name: 'PureComponent'})
          ) { return; }

          superClass.replaceWith(resolveLocalComponentIdentifier(state, t));
          importBinding.dereference();

          removeBindingIfUnused(importBinding);
        }
      },
    },
  };
}

function removeBindingIfUnused(binding) {
  if (binding.referenced) { return; }

  const {path} = binding;
  const {parentPath} = path;

  path.remove();

  if (parentPath.get('specifiers').length === 0) {
    parentPath.remove();
  }
}

function isReactImport(path) {
  return (
    (path.isImportDefaultSpecifier() || path.isImportNamespaceSpecifier()) &&
    path.parentPath.get('source').isStringLiteral({value: 'react'})
  );
}

function isComponentImport(path) {
  return path.isImportSpecifier() && path.get('imported').isIdentifier({name: 'Component'});
}

function resolveLocalComponentIdentifier(state, t) {
  if (state.namedImport) {
    return state.namedImport.get('local').node;
  } else if (state.namespaceImport) {
    return t.memberExpression(
      state.namespaceImport.get('local').node,
      t.identifier('Component')
    );
  } else if (state.defaultImport) {
    return t.memberExpression(
      state.defaultImport.get('local').node,
      t.identifier('Component')
    );
  } else {
    const identifier = state.siblingNamedImport.scope.generateUidIdentifier('Component');

    state.siblingNamedImport.insertAfter([
      t.importSpecifier(identifier, t.identifier('Component')),
    ]);

    state.namedImport = state.siblingNamedImport.parentPath.get('specifiers').find(isComponentImport);

    return identifier;
  }
}
