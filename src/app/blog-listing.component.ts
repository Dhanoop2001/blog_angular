import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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

@Component({
  standalone: true,
  selector: 'blog-listing',
  imports: [
    CommonModule,
    RouterModule,
    MatSnackBarModule
  ],
  template: `
<section class="blogs-list">
  <div class="hero">
    <h1>Published Blogs</h1>
    <a routerLink="/home" class="btn btn-secondary">← Back to Home</a>
  </div>

  <!-- Loading state -->
  <div *ngIf="isLoadingBlogs" class="loading-state">
    <span class="spinner"></span> Loading published blogs...
  </div>

  <!-- Empty state -->
  <div *ngIf="!isLoadingBlogs && publishedBlogs.length === 0" class="empty-state">
    No published blogs found.
  </div>

  <div *ngIf="!isLoadingBlogs && publishedBlogs.length > 0">
    <h3>Published Blogs ({{ publishedBlogs.length }})</h3>
    <ul>
      <li *ngFor="let blog of publishedBlogs; trackBy: trackById"
          class="published">

        <div *ngIf="blog.image" class="blog-image">
          <img [src]="'http://localhost:3001' + blog.image"
               alt="Blog image"
               style="max-width: 200px; max-height: 150px; object-fit: cover;">
        </div>

        <div class="blog-header">
          <strong>{{ blog.title }}</strong>
          <span class="blog-status status-published">
            {{ blog.status }}
          </span>
        </div>

        <div class="blog-meta">
          <span class="blog-author">by {{ blog.author }}</span>
          <span class="blog-date">Created: {{ blog.createdAt | date:'medium' }}</span>
          <!-- NO updatedAt shown as per requirements -->
        </div>

        <p class="blog-content" *ngIf="isExpanded(blog); else previewContent" [innerHTML]="sanitizedContent(blog.content)"></p>
        <ng-template #previewContent>
          <p class="blog-content">{{ getContentPreview(blog.content) }}</p>
        </ng-template>

        <button
          *ngIf="shouldShowToggle(blog.content)"
          type="button"
          class="read-toggle"
          (click)="toggleExpanded(blog)">
          {{ isExpanded(blog) ? 'Show less' : 'Show more' }}
        </button>

        <!-- NO edit/delete/actions -->
      </li>
    </ul>
  </div>
</section>
  `,
  styleUrls: ['./blog-listing.css'],
})
export class BlogListing implements OnInit {
  blogs: Blog[] = [];
  isLoadingBlogs = false;
  private readonly previewLength = 250;
  private expandedBlogKeys = new Set<string | number>();

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadBlogs();
  }

  trackById(index: number, blog: Blog): string | number {
    return blog._id || blog.id || index;
  }

  get publishedBlogs(): Blog[] {
    return this.blogs.filter(blog => blog.status === 'Publish');
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

  loadBlogs() {
    this.isLoadingBlogs = true;

    this.http.get<Blog[]>('http://localhost:3001/api/blogs').subscribe({
      next: (data) => {
        this.blogs = data.map(blog => ({
          ...blog,
          id: blog.id || blog._id
        }));
        this.isLoadingBlogs = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading blogs', err);
        this.isLoadingBlogs = false;
        this.cdr.detectChanges();
        this.snackBar.open(
          'Failed to load blogs: ' + (err.error?.message || err.message || 'Unknown error'),
          'Close',
          { duration: 5000, panelClass: ['snackbar-error'] }
        );
      }
    });
  }
}
