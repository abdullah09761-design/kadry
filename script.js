// ============================================
// BOOK LIBRARY MANAGER - Supabase CRUD Application
// ============================================
// IMPORTANT: Replace these with your Supabase credentials
// ============================================

// SUPABASE CONFIGURATION - REPLACE THESE VALUES WITH YOUR OWN
const SUPABASE_URL = 'https://uiubwlbgfnjwtlqfspot.supabase.co';  // Replace with your Supabase URL
const SUPABASE_KEY = 'sb_publishable_PTfxXzFU-mZQhN82hWgTOQ_GVhtjV-d';  // Replace with your Supabase Anon Key

// ============================================
// DO NOT MODIFY BELOW THIS LINE
// ============================================

// Initialize Supabase client
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (error) {
    console.error('Error initializing Supabase client:', error);
    showToast('Failed to initialize Supabase. Please check your credentials.', 'error');
}

// DOM Elements
const addBookForm = document.getElementById('addBookForm');
const editBookForm = document.getElementById('editBookForm');
const searchInput = document.getElementById('searchInput');
const booksTableBody = document.getElementById('booksTableBody');
const bookCount = document.getElementById('bookCount');
const noBooksMessage = document.getElementById('noBooksMessage');
const loadingRow = document.getElementById('loadingRow');
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');
const cancelEditBtn = document.getElementById('cancelEdit');
const bookToDeleteTitle = document.getElementById('bookToDeleteTitle');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const toast = document.getElementById('toast');
const currentYear = document.getElementById('currentYear');

// State variables
let books = [];
let currentEditBookId = null;
let currentDeleteBookId = null;
let isEditMode = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    currentYear.textContent = new Date().getFullYear();
    
    // Load all books on page load
    loadBooks();
    
    // Set up event listeners
    setupEventListeners();
});

// Set up all event listeners
function setupEventListeners() {
    // Add book form submission
    addBookForm.addEventListener('submit', handleAddBook);
    
    // Edit book form submission
    editBookForm.addEventListener('submit', handleEditBook);
    
    // Cancel edit button
    cancelEditBtn.addEventListener('click', cancelEditMode);
    
    // Search input for filtering books
    searchInput.addEventListener('input', filterBooks);
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });
    
    // Confirm delete button
    confirmDeleteBtn.addEventListener('click', handleDeleteBook);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === editModal) {
            closeAllModals();
        }
        if (event.target === deleteModal) {
            closeAllModals();
        }
    });
}

// ============================================
// CRUD OPERATIONS
// ============================================

// CREATE: Add a new book to the database
async function handleAddBook(event) {
    event.preventDefault();
    
    if (!supabase) {
        showToast('Supabase not initialized. Please check your credentials.', 'error');
        return;
    }
    
    // Get form values
    const title = document.getElementById('title').value.trim();
    const author = document.getElementById('author').value.trim();
    const category = document.getElementById('category').value;
    
    // Validate input
    if (!title || !author) {
        showToast('Title and Author are required fields.', 'error');
        return;
    }
    
    try {
        // Insert book into Supabase
        const { data, error } = await supabase
            .from('books')
            .insert([
                { title, author, category }
            ])
            .select();
        
        if (error) {
            throw error;
        }
        
        // Add the new book to the local array
        if (data && data.length > 0) {
            books.unshift(data[0]);
            renderBooks();
            showToast('Book added successfully!', 'success');
            
            // Reset form
            addBookForm.reset();
        }
    } catch (error) {
        console.error('Error adding book:', error);
        showToast('Failed to add book. Please try again.', 'error');
    }
}

// READ: Load all books from the database
async function loadBooks() {
    if (!supabase) {
        showToast('Supabase not initialized. Please check your credentials.', 'error');
        loadingRow.classList.add('hidden');
        return;
    }
    
    try {
        // Fetch all books from Supabase, ordered by newest first
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('id', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        // Update books array
        books = data || [];
        
        // Render books in the table
        renderBooks();
        
        // Hide loading row
        loadingRow.classList.add('hidden');
        
    } catch (error) {
        console.error('Error loading books:', error);
        showToast('Failed to load books. Please check your connection.', 'error');
        loadingRow.innerHTML = '<td colspan="4">Error loading books. Please check console.</td>';
    }
}

// UPDATE: Edit an existing book
function openEditModal(book) {
    // Set form values
    document.getElementById('editBookId').value = book.id;
    document.getElementById('editTitle').value = book.title;
    document.getElementById('editAuthor').value = book.author;
    document.getElementById('editCategory').value = book.category;
    
    // Store the book ID for later use
    currentEditBookId = book.id;
    
    // Show the modal
    editModal.classList.remove('hidden');
    
    // Set edit mode
    isEditMode = true;
    cancelEditBtn.classList.remove('hidden');
}

// Handle edit form submission
async function handleEditBook(event) {
    event.preventDefault();
    
    if (!supabase) {
        showToast('Supabase not initialized. Please check your credentials.', 'error');
        return;
    }
    
    // Get form values
    const id = document.getElementById('editBookId').value;
    const title = document.getElementById('editTitle').value.trim();
    const author = document.getElementById('editAuthor').value.trim();
    const category = document.getElementById('editCategory').value;
    
    // Validate input
    if (!title || !author) {
        showToast('Title and Author are required fields.', 'error');
        return;
    }
    
    try {
        // Update book in Supabase
        const { error } = await supabase
            .from('books')
            .update({ title, author, category })
            .eq('id', id);
        
        if (error) {
            throw error;
        }
        
        // Update the book in the local array
        const bookIndex = books.findIndex(book => book.id == id);
        if (bookIndex !== -1) {
            books[bookIndex] = { ...books[bookIndex], title, author, category };
            renderBooks();
        }
        
        // Close modal and show success message
        closeAllModals();
        showToast('Book updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating book:', error);
        showToast('Failed to update book. Please try again.', 'error');
    }
}

// DELETE: Remove a book from the database
function openDeleteModal(book) {
    // Set the book title in the confirmation message
    bookToDeleteTitle.textContent = `"${book.title}"`;
    
    // Store the book ID for later use
    currentDeleteBookId = book.id;
    
    // Show the modal
    deleteModal.classList.remove('hidden');
}

// Handle book deletion
async function handleDeleteBook() {
    if (!supabase) {
        showToast('Supabase not initialized. Please check your credentials.', 'error');
        return;
    }
    
    try {
        // Delete book from Supabase
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', currentDeleteBookId);
        
        if (error) {
            throw error;
        }
        
        // Remove the book from the local array
        books = books.filter(book => book.id != currentDeleteBookId);
        
        // Update the UI
        renderBooks();
        
        // Close modal and show success message
        closeAllModals();
        showToast('Book deleted successfully!', 'success');
        
        // Reset the delete book ID
        currentDeleteBookId = null;
        
    } catch (error) {
        console.error('Error deleting book:', error);
        showToast('Failed to delete book. Please try again.', 'error');
    }
}

// ============================================
// UI FUNCTIONS
// ============================================

// Render books in the table
function renderBooks() {
    // Filter books based on search term
    const searchTerm = searchInput.value.toLowerCase();
    const filteredBooks = books.filter(book => 
        book.title.toLowerCase().includes(searchTerm)
    );
    
    // Clear the table body
    booksTableBody.innerHTML = '';
    
    // Show/hide no books message
    if (filteredBooks.length === 0) {
        noBooksMessage.classList.remove('hidden');
        bookCount.textContent = 'No books found';
    } else {
        noBooksMessage.classList.add('hidden');
        bookCount.textContent = `${filteredBooks.length} ${filteredBooks.length === 1 ? 'book' : 'books'}`;
    }
    
    // Create table rows for each book
    filteredBooks.forEach(book => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${escapeHtml(book.title)}</strong></td>
            <td>${escapeHtml(book.author)}</td>
            <td>
                <span class="category-tag">${escapeHtml(book.category)}</span>
            </td>
            <td class="actions-cell">
                <button class="btn btn-edit edit-btn" data-id="${book.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-delete delete-btn" data-id="${book.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        
        booksTableBody.appendChild(row);
    });
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.getAttribute('data-id');
            const book = books.find(b => b.id == bookId);
            if (book) {
                openEditModal(book);
            }
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.getAttribute('data-id');
            const book = books.find(b => b.id == bookId);
            if (book) {
                openDeleteModal(book);
            }
        });
    });
}

// Filter books based on search input
function filterBooks() {
    renderBooks();
}

// Cancel edit mode
function cancelEditMode() {
    isEditMode = false;
    cancelEditBtn.classList.add('hidden');
    addBookForm.reset();
}

// Close all modals
function closeAllModals() {
    editModal.classList.add('hidden');
    deleteModal.classList.add('hidden');
    currentEditBookId = null;
    currentDeleteBookId = null;
}

// Show toast notification
function showToast(message, type = 'info') {
    // Set message and type
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Add icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    
    // Show the toast
    toast.classList.remove('hidden');
    
    // Hide after 4 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// Utility function to escape HTML (prevent XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


