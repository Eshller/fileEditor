# PDF Editor Application

## Overview

This is a full-stack PDF editor application built with React, Express, and TypeScript. The application allows users to upload, view, and annotate PDF documents with various tools including text, highlighting, drawing, and erasing capabilities. The frontend provides a modern, responsive interface using shadcn/ui components, while the backend handles file processing and serves the application.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: shadcn/ui components built on top of Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming support, including dark mode capability
- **State Management**: React hooks with custom hooks for PDF handling (`usePdf`) and annotations (`useAnnotations`)
- **Client-side Routing**: Wouter for lightweight routing
- **Data Fetching**: TanStack Query (React Query) for server state management and caching

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Build System**: ESBuild for production bundling of server code
- **Development**: TSX for TypeScript execution during development
- **Storage Interface**: Abstracted storage layer with in-memory implementation (`MemStorage`) that can be extended for database persistence
- **Error Handling**: Centralized error handling middleware for API routes

### PDF Processing
- **PDF Rendering**: PDF.js for client-side PDF rendering and display
- **PDF Manipulation**: pdf-lib for exporting PDFs with annotations
- **Canvas-based Annotations**: HTML5 Canvas for drawing and annotation overlays
- **Annotation Types**: Support for text, highlighting, freehand drawing, and eraser tools

### Database Design
- **Schema**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **User Management**: Basic user schema with username/password authentication structure
- **Migrations**: Drizzle Kit for database migrations and schema management

### Development Environment
- **Monorepo Structure**: Client and server code in a single repository with shared TypeScript configuration
- **Path Aliases**: Configured aliases for clean imports (`@/` for client, `@shared/` for shared code)
- **Hot Reload**: Vite HMR for frontend and TSX for backend development
- **Type Safety**: Strict TypeScript configuration across the entire codebase

### Component Architecture
- **Modular Components**: Organized component structure with reusable UI components
- **Custom Hooks**: Dedicated hooks for PDF operations, annotations, and mobile detection
- **Type Definitions**: Comprehensive TypeScript interfaces for PDF documents, annotations, and tools

## External Dependencies

### Core Frameworks
- **@vitejs/plugin-react**: Vite React plugin for JSX transformation and fast refresh
- **express**: Web framework for the Node.js backend server
- **react**: Frontend framework for building the user interface
- **typescript**: Type checking and compilation for both frontend and backend

### Database & ORM
- **drizzle-orm**: Type-safe SQL ORM for database operations
- **drizzle-kit**: Database migration and introspection toolkit
- **@neondatabase/serverless**: Serverless PostgreSQL database driver
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### PDF Processing
- **pdfjs-dist**: Mozilla's PDF.js library for rendering PDF documents in the browser
- **pdf-lib**: Library for creating and modifying PDF documents

### UI Components & Styling
- **@radix-ui/***: Comprehensive collection of unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Utility for creating component variants
- **clsx**: Utility for constructing className strings conditionally

### State Management & Data Fetching
- **@tanstack/react-query**: Powerful data synchronization for React applications
- **react-hook-form**: Performant forms library with minimal re-renders
- **@hookform/resolvers**: Validation resolvers for react-hook-form

### Development Tools
- **@replit/vite-plugin-***: Replit-specific plugins for development environment integration
- **postcss**: CSS post-processor for Tailwind CSS
- **autoprefixer**: PostCSS plugin for adding vendor prefixes

### Utilities
- **nanoid**: Compact URL-safe unique string ID generator
- **date-fns**: Modern JavaScript date utility library
- **lucide-react**: Beautiful & consistent icon toolkit
- **cmdk**: Fast command menu component for React
- **embla-carousel-react**: Lightweight carousel library