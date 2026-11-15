import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ACCEPTED_FILES, ImportError, ImportedBook, importBook } from '../core/book-import';
import { BookText } from '../core/book-text';
import { Library } from '../core/library';
import { Book, newId } from '../core/models';
import { Notifier } from '../core/notifier';
import { BookCover } from './book-cover';
import { Icon } from './icon';
import { FieldState, TextField, checkAll, validators } from './text-field';

type Status = 'empty' | 'reading' | 'ready';

const FORMAT_NAMES = { epub: 'EPUB', pdf: 'PDF', txt: 'Plain text' } as const;
const wordFormat = new Intl.NumberFormat('en-GB');

/**
 * Adds a book from the reader's device. The file is read as soon as it is
 * chosen, so the title, author and cover can be filled in from the file
 * itself before anything is saved.
 */
@Component({
  selector: 'app-upload-book-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TextField, BookCover],
  template: `
    <dialog #dialog class="dialog" aria-labelledby="upload-title">
      <form novalidate (submit)="save($event)">
        <div class="flex items-start justify-between gap-4">
          <h2 id="upload-title" class="text-2xl">Add a book from your device</h2>
          <button
            type="button"
            class="icon-btn -mr-2 -mt-2"
            aria-label="Close"
            (click)="dialog.close()"
          >
            <app-icon name="close" />
          </button>
        </div>
        <p class="mt-1 text-ink-soft">
          EPUB, PDF or TXT, up to 50 MB. The file is read here and never leaves this browser.
        </p>

        <label
          class="dropzone mt-5"
          [class.is-dragging]="dragging()"
          [class.is-ready]="status() === 'ready'"
          (dragover)="onDragOver($event)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)"
        >
          <input
            #fileField
            class="visually-hidden"
            type="file"
            [accept]="accepted"
            [attr.aria-invalid]="fileError() ? 'true' : null"
            aria-describedby="upload-file-note"
            (change)="onPicked(fileField)"
          />
          @switch (status()) {
            @case ('reading') {
              <span class="spinner"></span>
              <span class="font-semibold" aria-live="polite">{{ progress() }}</span>
            }
            @case ('ready') {
              @if (preview(); as book) {
                <span class="w-14 shrink-0"><app-book-cover [book]="book" decorative /></span>
              }
              <span class="min-w-0 text-left">
                <span class="block truncate font-semibold">{{ fileName() }}</span>
                <span class="num block text-sm text-ink-soft">{{ summary() }}</span>
                <span class="mt-1 block text-sm font-semibold text-accent-text">
                  Choose another file
                </span>
              </span>
            }
            @default {
              <app-icon name="upload" [size]="28" />
              <span class="font-semibold">Choose a file</span>
              <span class="text-sm text-ink-soft">or drop it here</span>
            }
          }
        </label>
        <p
          id="upload-file-note"
          class="field-note"
          [class.is-error]="fileError()"
          [attr.role]="fileError() ? 'alert' : null"
        >
          {{ fileError() }}
        </p>

        @if (status() === 'ready') {
          <div class="mt-2 grid gap-2">
            <app-text-field #titleControl label="Title" [state]="title" />
            <app-text-field #authorControl label="Author" [state]="author" />
          </div>
        }

        <div class="mt-4 flex flex-wrap justify-end gap-3">
          <button type="button" class="btn" (click)="dialog.close()">Cancel</button>
          <button type="submit" class="btn btn-primary" [attr.aria-busy]="saving()">
            @if (saving()) {
              <span class="spinner"></span>
            }
            {{ saving() ? 'Adding' : 'Add to ' + targetShelfName() }}
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class UploadBookDialog {
  private readonly library = inject(Library);
  private readonly bookText = inject(BookText);
  private readonly notifier = inject(Notifier);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly fileField = viewChild.required<ElementRef<HTMLInputElement>>('fileField');
  private readonly titleControl = viewChild<TextField>('titleControl');
  private readonly authorControl = viewChild<TextField>('authorControl');

  protected readonly accepted = ACCEPTED_FILES;
  protected readonly status = signal<Status>('empty');
  protected readonly progress = signal('');
  protected readonly fileName = signal('');
  protected readonly fileError = signal<string | null>(null);
  protected readonly dragging = signal(false);
  protected readonly saving = signal(false);
  private readonly imported = signal<ImportedBook | null>(null);
  /** Increases with every chosen file, so a slow earlier file cannot overwrite a newer one. */
  private attempt = 0;

  protected readonly title = new FieldState(validators.required('Enter the book’s title.'));
  protected readonly author = new FieldState(validators.required('Enter the author’s name.'));

  private readonly targetShelf = computed(() => {
    const shelves = this.library.state().shelves;
    return shelves.find((shelf) => shelf.id === 'reading') ?? shelves[0] ?? null;
  });
  protected readonly targetShelfName = computed(() => this.targetShelf()?.name ?? 'my library');

  /** A stand-in book, so the dialog shows the cover exactly as it will look on the shelf. */
  protected readonly preview = computed<Book | null>(() => {
    const book = this.imported();
    if (!book) return null;
    return {
      id: 'upload-preview',
      title: this.title.value() || book.title || 'Untitled',
      author: this.author.value() || book.author || '',
      year: null,
      source: 'upload',
      coverUrl: book.coverDataUrl,
      readable: true,
    };
  });

  protected readonly summary = computed(() => {
    const book = this.imported();
    if (!book) return '';
    const words = book.blocks.reduce((total, block) => total + block.text.split(' ').length, 0);
    return `${FORMAT_NAMES[book.format]}, about ${wordFormat.format(Math.round(words / 100) * 100)} words`;
  });

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  // ---- Choosing a file -------------------------------------------------------

  protected onPicked(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (file) void this.read(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) void this.read(file);
  }

  private async read(file: File): Promise<void> {
    const attempt = ++this.attempt;
    this.fileError.set(null);
    this.fileName.set(file.name);
    this.progress.set('Reading the file');
    this.status.set('reading');

    try {
      const book = await importBook(file, (message) => {
        if (attempt === this.attempt) this.progress.set(message);
      });
      if (attempt !== this.attempt) return;

      this.imported.set(book);
      // Fill in what the file knows, but never overwrite something already typed.
      if (!this.title.value().trim()) this.title.edit(book.title ?? '');
      if (!this.author.value().trim()) this.author.edit(book.author ?? '');
      this.status.set('ready');
    } catch (error) {
      if (attempt !== this.attempt) return;
      this.imported.set(null);
      this.status.set('empty');
      this.fileError.set(
        error instanceof ImportError
          ? error.message
          : 'This file could not be read. Try another copy of the book.',
      );
    } finally {
      // Lets the same file be chosen again after an error.
      this.fileField().nativeElement.value = '';
    }
  }

  // ---- Saving ---------------------------------------------------------------------

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;

    const book = this.imported();
    if (!book) {
      this.fileError.set(
        this.status() === 'reading'
          ? 'The file is still being read. It takes a moment for long books.'
          : 'Choose an EPUB, PDF or TXT file first.',
      );
      this.fileField().nativeElement.focus();
      return;
    }

    const titleControl = this.titleControl();
    const authorControl = this.authorControl();
    if (
      titleControl &&
      authorControl &&
      !checkAll([
        { state: this.title, control: titleControl },
        { state: this.author, control: authorControl },
      ])
    ) {
      return;
    }

    this.saving.set(true);
    try {
      const saved: Book = {
        id: newId('upload'),
        title: this.title.value().trim(),
        author: this.author.value().trim(),
        year: null,
        source: 'upload',
        coverUrl: book.coverDataUrl,
        readable: true,
      };
      await this.bookText.saveUpload(saved.id, book.blocks);

      const shelf = this.targetShelf();
      if (shelf) this.library.addToShelf(shelf.id, saved);
      else this.library.saveBook(saved);

      this.reset();
      this.dialog().nativeElement.close();
      this.notifier.show(
        shelf ? `“${saved.title}” added to ${shelf.name}` : `“${saved.title}” added`,
      );
    } catch {
      this.fileError.set(
        'The book could not be saved in this browser. Free some space, then add it again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private reset(): void {
    this.attempt += 1;
    this.imported.set(null);
    this.status.set('empty');
    this.fileName.set('');
    this.fileError.set(null);
    this.title.edit('');
    this.author.edit('');
  }
}
