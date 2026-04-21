import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface Blog {
  _id?: string;
  id?: number | string;
  title: string;
  slug?: string;
  content: string;
  author: string;
  status: 'Publish' | 'Draft';
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

type BlogFilter = 'all' | 'published' | 'drafted';

@Component({
  standalone: true,
  selector: 'home-page',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatRadioModule,
    MatSnackBarModule
  ],
  template: `
<section class="home">
  <div class="hero">
    <h1>BLOG MANAGING SYSTEM</h1>
    <button (click)="openModal()" class="btn btn-primary">✚ Add New Blog</button>
    <a routerLink="/blogs" class="btn btn-secondary">📋 Blog Listing</a>
    <h3>List of Blogs</h3>
    <h3>Total Number of Blogs = <span class="blog-count">{{ blogs.length }}</span></h3>
  </div>


  <div class="blogs-list">
    <div class="filter-bar">
      <button class="btn"
              [class.btn-primary]="selectedFilter === 'all'"
              [class.btn-secondary]="selectedFilter !== 'all'"
              (click)="setFilter('all')">
        All Blogs ({{ blogs.length }})
      </button>
      <button class="btn"
              [class.btn-primary]="selectedFilter === 'published'"
              [class.btn-secondary]="selectedFilter !== 'published'"
              (click)="setFilter('published')">
        Published Blogs ({{ publishedBlogs.length }})
      </button>
      <button class="btn"
              [class.btn-primary]="selectedFilter === 'drafted'"
              [class.btn-secondary]="selectedFilter !== 'drafted'"
              (click)="setFilter('drafted')">
        Drafted Blogs ({{ draftBlogs.length }})
      </button>
    </div>

    <!-- Loading state -->
    <div *ngIf="isLoadingBlogs" class="loading-state">
      <span class="spinner"></span> Loading blogs...
    </div>

    <!-- Empty state -->
    <div *ngIf="!isLoadingBlogs && blogs.length === 0" class="empty-state">
      No blogs found. Click "Add New Blog" to create one.
    </div>

    <div *ngIf="!isLoadingBlogs && filteredBlogs.length > 0">
      <h3>{{ filterHeading }} ({{ filteredBlogs.length }})</h3>
      <ul>
        <li *ngFor="let blog of filteredBlogs; trackBy: trackById"
            [class.published]="blog.status === 'Publish'"
            [class.drafted]="blog.status === 'Draft'">

          <div *ngIf="blog.image" class="blog-image">
            <img [src]="'http://localhost:3001' + blog.image"
                 alt="Blog image"
                 style="max-width: 200px; max-height: 150px; object-fit: cover;">
          </div>

          <div class="blog-header">
            <strong>{{ blog.title }}</strong>
            <span class="blog-status"
                  [class.status-published]="blog.status === 'Publish'"
                  [class.status-drafted]="blog.status === 'Draft'">
              {{ blog.status }}
            </span>
          </div>

          <div class="blog-meta">
            <span class="blog-author">by {{ blog.author }}</span>
            <span class="blog-date">Created: {{ blog.createdAt | date:'medium' }}</span>
            <span *ngIf="blog.updatedAt && blog.updatedAt !== blog.createdAt" class="blog-date">
              Updated: {{ blog.updatedAt | date:'medium' }}
            </span>
          </div>

          <p class="blog-content" *ngIf="isExpanded(blog); else previewContent" [innerHTML]="sanitizedContent(blog.content)"></p>
          <ng-template #previewContent>
            <p class="blog-content">{{ getContentPreview(blog.content) }}</p>
          </ng-template>

          <button
            *ngIf="shouldShowToggle(blog.content)"
            type="button"
            class="btn btn-secondary"
            (click)="toggleExpanded(blog)">
            {{ isExpanded(blog) ? 'Show less' : 'Show more' }}
          </button>

          <div class="blog-actions">
            <button class="btn btn-secondary" (click)="openModal(blog)">Edit</button>
            <button class="btn btn-danger" (click)="deleteBlog(blog)">Delete</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</section>

<!-- Modal -->
<div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
  <div class="modal-content" (click)="$event.stopPropagation()">
    <h3>{{ editingBlogId ? 'Edit Blog' : 'Add New Blog' }}</h3>

    <form (ngSubmit)="saveBlog()">
      <label>Image:
        <input type="file" accept="image/*" (change)="onFileSelected($event)" [disabled]="isLoading">
        <small *ngIf="editingBlogId && blogForm.image">Current image will be kept if no new image selected</small>
      </label>

      <label>Title:
        <input type="text" [(ngModel)]="blogForm.title" name="title" required [disabled]="isLoading">
      </label>

      <label>Slug:
        <input type="text" [(ngModel)]="blogForm.slug" name="slug" [disabled]="isLoading">
      </label>

      <label>Content:
        <textarea [(ngModel)]="blogForm.content" name="content" required rows="6" [disabled]="isLoading"></textarea>
      </label>

      <label>Author:
        <input type="text" [(ngModel)]="blogForm.author" name="author" required [disabled]="isLoading">
      </label>

      <label>Status:</label>
      <mat-radio-group name="status" [(ngModel)]="blogForm.status" [disabled]="isLoading">
        <mat-radio-button value="Publish" class="black-radio">Publish</mat-radio-button>
        <mat-radio-button value="Draft" class="black-radio">Draft</mat-radio-button>
      </mat-radio-group>

      <div class="modal-buttons">
        <button
          type="submit"
          class="btn btn-primary"
          [disabled]="isLoading">
          <span *ngIf="isLoading" class="spinner"></span>
          {{ isLoading ? 'Saving...' : (editingBlogId ? 'Update Blog' : 'Save Blog') }}
        </button>
        <button
          type="button"
          (click)="closeModal()"
          class="btn btn-secondary"
          [disabled]="isLoading">
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>
  `,
  styleUrls: ['./home-page.css'],
})
export class HomePage implements OnInit {
  blogs: Blog[] = [];
  showModal = false;
  editingBlogId: string | null = null;
  blogForm: Blog = {
    title: '',
    slug: '',
    content: '',
    author: '',
    status: 'Publish'
  };
  selectedFile: File | null = null;
  isLoading = false;
  selectedFilter: BlogFilter = 'all';

  isLoadingBlogs = false;
  private readonly previewLength = 250;
  private expandedBlogKeys = new Set<string | number>();

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // FIX 2: Load blogs on init — works fine as long as HttpClient is
    // properly provided via provideHttpClient() in app.config.ts
    this.loadBlogs();
  }

  trackById(index: number, blog: Blog): string | number {
    return blog._id || blog.id || index;
  }

  get publishedBlogs(): Blog[] {
    return this.blogs.filter(blog => blog.status === 'Publish');
  }

  get draftBlogs(): Blog[] {
    return this.blogs.filter(blog => blog.status === 'Draft');
  }

  get filteredBlogs(): Blog[] {
    if (this.selectedFilter === 'published') return this.publishedBlogs;
    if (this.selectedFilter === 'drafted') return this.draftBlogs;
    return this.blogs;
  }

  get filterHeading(): string {
    if (this.selectedFilter === 'published') return 'Published Blogs';
    if (this.selectedFilter === 'drafted') return 'Drafted Blogs';
    return 'All Blogs';
  }

  setFilter(filter: BlogFilter) {
    this.selectedFilter = filter;
  }

  sanitizedContent(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  private getBlogKey(blog: Blog): string | number | null {
    if (blog._id) return blog._id;
    if (blog.id !== undefined && blog.id !== null) return blog.id;
    return null;
  }

  isExpanded(blog: Blog): boolean {
    const key = this.getBlogKey(blog);
    if (key === null) return false;
    return this.expandedBlogKeys.has(key);
  }

  toggleExpanded(blog: Blog) {
    const key = this.getBlogKey(blog);
    if (key === null) return;
    if (this.expandedBlogKeys.has(key)) {
      this.expandedBlogKeys.delete(key);
    } else {
      this.expandedBlogKeys.add(key);
    }
  }

  private toPlainText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  shouldShowToggle(content: string): boolean {
    return this.toPlainText(content).length > this.previewLength;
  }

  getContentPreview(content: string): string {
    const text = this.toPlainText(content);
    if (text.length <= this.previewLength) return text;
    return text.slice(0, this.previewLength).trimEnd() + '...';
  }

  // FIX 3: cdr.detectChanges() is now called INSIDE the next() callback,
  // after this.blogs is actually set — not outside the subscribe()
  loadBlogs() {
    this.isLoadingBlogs = true;

    this.http.get<Blog[]>('http://localhost:3001/api/blogs').subscribe({
      next: (data) => {
        this.blogs = data.map(blog => ({
          ...blog,
          id: blog.id || blog._id
        }));
        this.isLoadingBlogs = false;
        // ✅ detectChanges fires AFTER data is set
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading blogs', err);
        this.isLoadingBlogs = false;
        this.cdr.detectChanges();
        // Show a visible error instead of silent console.error
        this.showNotification(
          'Failed to load blogs: ' + (err.error?.message || err.message || 'Unknown error'),
          true
        );
      }
    });
  }

  openModal(blog?: Blog) {
    if (blog) {
      this.editingBlogId = blog._id || (blog.id?.toString() || null);
      this.blogForm = {
        title: blog.title,
        slug: blog.slug || '',
        content: blog.content,
        author: blog.author,
        status: blog.status,
        image: blog.image
      };
      this.selectedFile = null;
    } else {
      this.editingBlogId = null;
      this.blogForm = {
        title: '',
        slug: '',
        content: '',
        author: '',
        status: 'Publish'
      };
      this.selectedFile = null;
    }
    this.showModal = true;
    this.isLoading = false;
  }

  closeModal() {
    this.showModal = false;
    this.editingBlogId = null;
    this.selectedFile = null;
    this.blogForm = {
      title: '',
      slug: '',
      content: '',
      author: '',
      status: 'Publish'
    };
    this.isLoading = false;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  private showNotification(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: isError ? 5000 : 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success']
    });
  }

  saveBlog() {
    if (this.isLoading) return;

    this.isLoading = true;

    const formData = new FormData();
    formData.append('title', this.blogForm.title);
    formData.append('slug', this.blogForm.slug || '');
    formData.append('content', this.blogForm.content);
    formData.append('author', this.blogForm.author);
    formData.append('status', this.blogForm.status);

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    const isEditing = !!this.editingBlogId;
    const url = isEditing
      ? `http://localhost:3001/api/blogs/${this.editingBlogId}`
      : 'http://localhost:3001/api/blogs';

    const request$ = isEditing
      ? this.http.put(url, formData)
      : this.http.post(url, formData);

    request$.subscribe({
      next: (response: any) => {
        const message = isEditing ? 'Blog updated successfully!' : 'Blog added successfully!';

        if (isEditing) {
          // FIX 4: For edits, update the local array and create a NEW array
          // reference so Angular's change detection picks up the mutation
          const index = this.blogs.findIndex(b => (b._id || b.id) === this.editingBlogId);
          if (index !== -1) {
            this.blogs[index] = {
              ...this.blogs[index],
              title: this.blogForm.title,
              slug: this.blogForm.slug || '',
              content: this.blogForm.content,
              author: this.blogForm.author,
              status: this.blogForm.status,
              image: this.selectedFile
                ? (response?.image || this.blogForm.image)
                : this.blogs[index].image,
              updatedAt: response?.updatedAt || new Date().toISOString()
            };
          }
          // ✅ Spread into a new array so Angular detects the change
          this.blogs = [...this.blogs];

          this.closeModal();
          this.cdr.detectChanges();
        } else {
          // FIX 5: For new blogs — close modal FIRST, then reload.
          // Previously loadBlogs() was called before closeModal(), so
          // detectChanges() fired before the HTTP response from loadBlogs()
          // came back, meaning the new blog was never shown without a refresh.
          this.closeModal();
          this.loadBlogs(); // ✅ loadBlogs() now calls cdr.detectChanges() internally
        }

        this.showNotification(message);
      },
      error: (err) => {
        console.error(isEditing ? 'Update error:' : 'Add error:', err);

        let errorMsg = err.error?.message || err.message || 'Unknown error occurred';
        if (err.status === 400) {
          errorMsg = 'Bad Request: Please check all fields are filled correctly.';
        }

        this.showNotification(`Failed: ${errorMsg}`, true);
        this.isLoading = false;
      }
    });
  }

  deleteBlog(blog: Blog) {
    const blogId = blog._id || blog.id;
    if (!blogId) {
      this.showNotification('Cannot delete: Blog ID not found', true);
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete "${blog.title}"?`);
    if (!confirmed) return;

    // Optimistic delete: remove from UI immediately
    const index = this.blogs.findIndex(b => (b._id || b.id) === blogId);
    let removedBlog: Blog | undefined;
    if (index !== -1) {
      removedBlog = this.blogs[index];
      this.blogs.splice(index, 1);
      // ✅ New array reference for change detection
      this.blogs = [...this.blogs];
      this.cdr.detectChanges();
    }

    this.http.delete(`http://localhost:3001/api/blogs/${blogId}`)
      .subscribe({
        next: () => {
          this.showNotification('Blog deleted successfully!');
        },
        error: (err) => {
          console.error('Delete failed:', err);
          this.showNotification(`Delete failed: ${err.error?.message || err.message}`, true);
          // Reload from server to restore the blog that failed to delete
          this.loadBlogs();
        }
      });
  }

  async logout() {
    const result = await Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout? You will be redirected to the sign in page.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.authService.logout();
    }
  }
}
