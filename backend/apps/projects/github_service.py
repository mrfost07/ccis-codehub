"""
GitHub API Integration Service
Fetches repository info, branches, and commits from GitHub
"""
import requests
import re
from django.conf import settings
from typing import Optional, Dict, List, Any


class GitHubService:
    """Service to interact with GitHub API"""
    
    BASE_URL = "https://api.github.com"
    
    def __init__(self):
        self.token = getattr(settings, 'GITHUB_ACCESS_TOKEN', None)
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "CCIS-CodeHub"
        }
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"
    
    def parse_github_url(self, url: str) -> Optional[Dict[str, str]]:
        """
        Parse GitHub URL to extract owner and repo name
        Supports formats:
        - https://github.com/owner/repo
        - https://github.com/owner/repo.git
        - github.com/owner/repo
        """
        patterns = [
            r"(?:https?://)?github\.com/([^/]+)/([^/.]+)(?:\.git)?/?",
        ]
        
        for pattern in patterns:
            match = re.match(pattern, url)
            if match:
                return {
                    "owner": match.group(1),
                    "repo": match.group(2)
                }
        return None
    
    def get_repository(self, owner: str, repo: str) -> Optional[Dict[str, Any]]:
        """Fetch repository information"""
        try:
            url = f"{self.BASE_URL}/repos/{owner}/{repo}"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            return {
                "id": data.get("id"),
                "name": data.get("name"),
                "full_name": data.get("full_name"),
                "description": data.get("description"),
                "html_url": data.get("html_url"),
                "language": data.get("language"),
                "default_branch": data.get("default_branch"),
                "stars": data.get("stargazers_count"),
                "forks": data.get("forks_count"),
                "open_issues": data.get("open_issues_count"),
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
                "visibility": "public" if not data.get("private") else "private"
            }
        except requests.RequestException as e:
            print(f"Error fetching repository: {e}")
            return None
    
    def get_branches(self, owner: str, repo: str, per_page: int = 30) -> List[Dict[str, Any]]:
        """Fetch repository branches"""
        try:
            url = f"{self.BASE_URL}/repos/{owner}/{repo}/branches"
            params = {"per_page": per_page}
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            branches = []
            for branch in response.json():
                branches.append({
                    "name": branch.get("name"),
                    "sha": branch.get("commit", {}).get("sha"),
                    "protected": branch.get("protected", False)
                })
            return branches
        except requests.RequestException as e:
            print(f"Error fetching branches: {e}")
            return []
    
    def get_commits(self, owner: str, repo: str, branch: str = None, per_page: int = 30) -> List[Dict[str, Any]]:
        """Fetch repository commits"""
        try:
            url = f"{self.BASE_URL}/repos/{owner}/{repo}/commits"
            params = {"per_page": per_page}
            if branch:
                params["sha"] = branch
            
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            commits = []
            for commit in response.json():
                commit_data = commit.get("commit", {})
                author = commit_data.get("author", {})
                commits.append({
                    "sha": commit.get("sha"),
                    "short_sha": commit.get("sha", "")[:7],
                    "message": commit_data.get("message", ""),
                    "author_name": author.get("name"),
                    "author_email": author.get("email"),
                    "date": author.get("date"),
                    "html_url": commit.get("html_url"),
                    "stats": commit.get("stats", {})
                })
            return commits
        except requests.RequestException as e:
            print(f"Error fetching commits: {e}")
            return []
    
    def get_pull_requests(self, owner: str, repo: str, state: str = "all", per_page: int = 30) -> List[Dict[str, Any]]:
        """Fetch repository pull requests"""
        try:
            url = f"{self.BASE_URL}/repos/{owner}/{repo}/pulls"
            params = {"state": state, "per_page": per_page}
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            prs = []
            for pr in response.json():
                prs.append({
                    "id": pr.get("id"),
                    "number": pr.get("number"),
                    "title": pr.get("title"),
                    "description": pr.get("body"),
                    "state": pr.get("state"),
                    "html_url": pr.get("html_url"),
                    "created_at": pr.get("created_at"),
                    "updated_at": pr.get("updated_at"),
                    "merged_at": pr.get("merged_at"),
                    "source_branch": pr.get("head", {}).get("ref"),
                    "target_branch": pr.get("base", {}).get("ref"),
                    "author": pr.get("user", {}).get("login"),
                    "author_avatar": pr.get("user", {}).get("avatar_url")
                })
            return prs
        except requests.RequestException as e:
            print(f"Error fetching pull requests: {e}")
            return []
    
    def sync_repository_data(self, github_url: str) -> Optional[Dict[str, Any]]:
        """
        Main method to sync all repository data from a GitHub URL
        Returns dict with repo info, branches, and commits
        """
        parsed = self.parse_github_url(github_url)
        if not parsed:
            return None
        
        owner = parsed["owner"]
        repo = parsed["repo"]
        
        repo_info = self.get_repository(owner, repo)
        if not repo_info:
            return None
        
        branches = self.get_branches(owner, repo)
        default_branch = repo_info.get("default_branch", "main")
        commits = self.get_commits(owner, repo, branch=default_branch, per_page=20)
        pull_requests = self.get_pull_requests(owner, repo, state="all", per_page=20)
        
        return {
            "repository": repo_info,
            "branches": branches,
            "commits": commits,
            "pull_requests": pull_requests
        }


# Singleton instance
github_service = GitHubService()
