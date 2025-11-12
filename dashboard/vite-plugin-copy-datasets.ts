/**
 * Vite Plugin: Copy Datasets
 * 
 * This plugin handles the datasets_trimmed folder for both development and production:
 * - Development: Creates a symlink in public/ to the root datasets_trimmed folder
 * - Production: Copies the datasets_trimmed folder to the dist/ output
 */

import type { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

export function copyDatasetsPlugin(): Plugin {
  return {
    name: 'copy-datasets',
    
    // Run during build
    closeBundle() {
      const rootDir = path.resolve(__dirname, '..');
      const sourceDir = path.join(rootDir, 'datasets_trimmed');
      const destDir = path.join(__dirname, 'dist', 'datasets_trimmed');
      
      if (fs.existsSync(sourceDir)) {
        console.log('📦 Copying datasets_trimmed to dist...');
        copyRecursiveSync(sourceDir, destDir);
        console.log('✅ Datasets copied successfully!');
      } else {
        console.warn('⚠️  datasets_trimmed folder not found at:', sourceDir);
      }
    },
    
    // Run during dev server startup
    configureServer() {
      const rootDir = path.resolve(__dirname, '..');
      const sourceDir = path.join(rootDir, 'datasets_trimmed');
      const publicDir = path.join(__dirname, 'public');
      const symlinkPath = path.join(publicDir, 'datasets_trimmed');
      
      // Create symlink in public folder for development
      if (fs.existsSync(sourceDir)) {
        // Remove existing symlink or directory
        if (fs.existsSync(symlinkPath)) {
          const stats = fs.lstatSync(symlinkPath);
          if (stats.isSymbolicLink()) {
            fs.unlinkSync(symlinkPath);
          } else if (stats.isDirectory()) {
            fs.rmSync(symlinkPath, { recursive: true, force: true });
          }
        }
        
        try {
          // Create symlink (works on Windows with admin rights, or use junction)
          if (process.platform === 'win32') {
            // Use junction on Windows (doesn't require admin)
            fs.symlinkSync(sourceDir, symlinkPath, 'junction');
          } else {
            // Use symlink on Unix-like systems
            fs.symlinkSync(sourceDir, symlinkPath, 'dir');
          }
          console.log('🔗 Created symlink: public/datasets_trimmed -> ../datasets_trimmed');
        } catch (error) {
          // If symlink fails, copy the folder instead
          console.warn('⚠️  Could not create symlink, copying folder instead...');
          copyRecursiveSync(sourceDir, symlinkPath);
          console.log('📁 Copied datasets_trimmed to public/');
        }
      } else {
        console.warn('⚠️  datasets_trimmed folder not found at:', sourceDir);
      }
    },
  };
}
