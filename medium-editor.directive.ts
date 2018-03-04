import 'rxjs/add/operator/debounceTime'; 
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/takeUntil';
import {Subject} from "rxjs/Subject";
import {
    Directive,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    Renderer,
    ɵlooseIdentical
} from '@angular/core';
import * as MediumEditor from 'medium-editor';

/**
 * Medium Editor wrapper directive.
 *
 * Examples
 * <medium-editor
      [(editorModel)]="textVar"
 *    [editorOptions]="{'toolbar': {'buttons': ['bold', 'italic', 'underline', 'h1', 'h2', 'h3']}}"
 *    [editorPlaceholder]="placeholderVar"
 *    [debounce]="5000"></medium-editor>
 */
@Directive({
  selector: 'medium-editor'
})
export class MediumEditorDirective implements OnInit, OnChanges, OnDestroy {

  private lastViewModel: string;
  private element: HTMLElement;
  private editor: any;
  private active: boolean;
  private inputEdited: EventEmitter<string> = new EventEmitter<string>();
  private componentDestroyed$: Subject<boolean> = new Subject();
  
	@Input('editorModel') model: any;
  @Input('editorOptions') options: any;
  @Input('editorPlaceholder') placeholder: string;
  @Input('debounce') debounce: number;

  @Output('editorModelChange') update = new EventEmitter();

  constructor(private el: ElementRef) { }

  ngOnInit() {
    this.element = this.el.nativeElement;
    this.element.innerHTML = '<div class="me-editable">' + (this.model == undefined ? '': this.model) + '</div>';
    this.active = true;
    

    if (this.placeholder && this.placeholder.length) {
      this.options.placeholder = {
        text : this.placeholder
      };
    }

    // Global MediumEditor
    this.editor = new MediumEditor('.me-editable', this.options);
    this.editor.subscribe('editableInput', (event, editable) => {
      let value = this.editor.getContent();
      value = value.replace(/&nbsp;/g, '').trim();
      if(this.debounce != undefined){
        this.inputEdited.emit(value);
      }
      else{
        this.updateModel(value);
      }
    });
    this.editor.subscribe('blur',()=>{
      if(this.debounce == undefined){return;}
      let value = this.editor.getContent();
      value = value.replace(/&nbsp;/g, '').trim();
      this.updateModel(value);
    })

    if(this.debounce != undefined){
      this.inputEdited
        .takeUntil(this.componentDestroyed$)
        .distinctUntilChanged()
        .debounceTime(this.debounce)
        .subscribe(x=> this.updateModel(x));
    }
  }

  refreshView() {
    if (this.editor) {
      this.editor.setContent(this.model);
    }
  }

  ngOnChanges(changes): void {
    if (this.isPropertyUpdated(changes, this.lastViewModel)) {
      this.lastViewModel = this.model;
      this.refreshView();
    }
  }

  /**
   * Emit updated model
   */
  updateModel(value:string): void {
    this.lastViewModel = value;
    this.update.emit(value);
  }

  /**
   * Remove MediumEditor on destruction of directive
   */
  ngOnDestroy(): void {
    this.editor.unsubscribe();
    this.componentDestroyed$.next(true);
    this.componentDestroyed$.complete();
  }

  isPropertyUpdated(changes, viewModel) {
    if (!changes.hasOwnProperty('model')) { return false; }

    const change = changes.model;

    if (change.isFirstChange()) {
      return true;
    }
    return !ɵlooseIdentical(viewModel, change.currentValue);
  }
}
