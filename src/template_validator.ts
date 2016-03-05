import 'reflect-metadata';
import {
  ComponentMetadata,
  PLATFORM_COMMON_PROVIDERS,
  Injector,
  APPLICATION_COMMON_PROVIDERS
} from 'angular2/core';
import {
  COMMON_DIRECTIVES,
  COMMON_PIPES
} from 'angular2/common';
import {CompileDirectiveMetadata, CompilePipeMetadata, CompileTypeMetadata} from 'angular2/src/compiler/directive_metadata';
import {TemplateParser} from 'angular2/src/compiler/template_parser';
import {COMPILER_PROVIDERS, TemplateAst, templateVisitAll} from 'angular2/src/compiler/compiler';
import {Parse5DomAdapter} from 'angular2/src/platform/server/parse5_adapter'
import {DirectiveInfo} from './walkers/ts/collect_component_metadata_walker';
import {ComponentMetadataCollector} from './component_metadata_collector';
import {TemplateValidationWalker} from './walkers/template/template_validation_walker';

Parse5DomAdapter.makeCurrent();

export class TemplateValidator {
  private injector: Injector;
  private parser: TemplateParser;
  constructor() {
    this.injector = Injector.resolveAndCreate([PLATFORM_COMMON_PROVIDERS, APPLICATION_COMMON_PROVIDERS, COMPILER_PROVIDERS]);
    this.parser = this.injector.get(TemplateParser);
  }
  validate(rootFile: string) {
    let collector = new ComponentMetadataCollector();
    let tree = collector.getComponentTree(rootFile) || [];
    return tree.map(c => this._validateDirectivesInTemplate(c)).filter(e => !!e).concat(
           tree.map(c => this._validateExpressionsInTemplate(c)).filter(e => !!e));
  }
  private _validateDirectivesInTemplate(component: any, _directives = COMMON_DIRECTIVES, _pipes = COMMON_PIPES) {
    let meta = component.metadata;
    if (meta instanceof ComponentMetadata) {
      let directives: any[] = (meta.directives || []).map(this._getDirective.bind(this)).concat(_directives);
      let pipes: any[] = (meta.pipes || []).map(this._getPipe.bind(this)).concat(_pipes);
      try {
        let ast = this.parser.parse(meta.template, directives, pipes, '');
        this._validateDirectives(ast);
      } catch (e) {
        return e;
      }
      return (meta.directives || []).map(c => this._validateDirectivesInTemplate(c, directives, pipes));
    } else {
      return null;
    }
  }
  private _validateDirectives(ast: TemplateAst[]) {
    templateVisitAll(new TemplateValidationWalker(), ast);
  }
  private _getDirective(dir) {
    let m = dir.metadata;
    return CompileDirectiveMetadata.create({
      selector: m.selector,
      type: new CompileTypeMetadata({ name: dir.classDeclaration.name.text }),
      inputs: m.inputs,
      outputs: m.outputs
    });
  }
  private _getPipe(pipe) {
    let m = pipe.metadata;
    return new CompilePipeMetadata({
      name: m.name,
      type: new CompileTypeMetadata({ name: pipe.classDeclaration.name.text })
    });
  }
  _validateExpressionsInTemplate(c) {
    return [];
  }
}
