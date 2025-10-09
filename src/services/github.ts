export interface GitHubFile {
  path: string;
  type: 'file' | 'dir';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  tree: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
    url: string;
  }>;
  truncated: boolean;
}

export class GitHubService {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Get the file tree for a repository
   */
  async getRepoTree(owner: string, repo: string, branch: string = 'main'): Promise<GitHubFile[]> {
    try {
      // First, get the default branch if not specified
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers: this.getHeaders() }
      );

      if (!repoResponse.ok) {
        // Try 'master' if 'main' fails
        if (branch === 'main') {
          return this.getRepoTree(owner, repo, 'master');
        }
        throw new Error(`Failed to fetch repository: ${repoResponse.statusText}`);
      }

      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch;

      // Get the tree
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers: this.getHeaders() }
      );

      if (!treeResponse.ok) {
        throw new Error(`Failed to fetch file tree: ${treeResponse.statusText}`);
      }

      const treeData: GitHubTreeResponse = await treeResponse.json();

      // Filter for JSON files and convert to our format
      return treeData.tree
        .filter(item => item.type === 'blob' && item.path.endsWith('.json'))
        .map(item => ({
          path: item.path,
          type: 'file' as const,
          sha: item.sha,
          size: item.size,
          url: item.url,
        }));
    } catch (error) {
      console.error('Error fetching repo tree:', error);
      throw error;
    }
  }

  /**
   * Get the content of a specific file
   */
  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      console.log(`Fetching file: ${owner}/${repo}/${path}`);

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders() }
      );

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error response:', errorBody);
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Response data keys:', Object.keys(data));

      // GitHub returns base64 encoded content
      if (data.content) {
        const decoded = atob(data.content.replace(/\n/g, ''));
        console.log('Decoded content length:', decoded.length);
        console.log('First 100 chars:', decoded.substring(0, 100));
        return decoded;
      }

      throw new Error('No content found in response');
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  }

  /**
   * Check if a file is likely a CALM file by examining its content
   */
  static isCALMFile(content: string): boolean {
    try {
      const parsed = JSON.parse(content);
      // Check for CALM-specific properties
      return !!(
        parsed.nodes ||
        parsed.relationships ||
        parsed.$schema?.includes('calm') ||
        parsed.metadata?.name
      );
    } catch {
      return false;
    }
  }
}

/**
 * LocalStorage management for GitHub token
 */
export const GitHubTokenStorage = {
  KEY: 'github_token',

  save(token: string): void {
    localStorage.setItem(this.KEY, token);
  },

  load(): string | null {
    return localStorage.getItem(this.KEY);
  },

  remove(): void {
    localStorage.removeItem(this.KEY);
  },
};
