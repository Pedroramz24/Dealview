"""
Automated Route Extraction Script for DealLinked Backend Refactoring
Extracts routes from server.py into organized domain-specific files.
"""
import re
import os
from collections import defaultdict

def extract_function_body(lines, start_idx):
    """Extract complete function body including decorators and docstrings."""
    # Go back to find decorator
    i = start_idx
    while i > 0 and (lines[i-1].strip().startswith('@') or not lines[i-1].strip()):
        i -= 1
    
    # Start from decorator or function def
    func_lines = []
    
    # Find function start
    func_start = start_idx
    while func_start > 0 and lines[func_start-1].strip().startswith('@'):
        func_start -= 1
    
    # Extract function body (everything until next @decorator or empty line + def)
    indent_level = None
    i = func_start
    in_function = False
    
    while i < len(lines):
        line = lines[i]
        
        # Start capturing from first decorator or def
        if line.strip().startswith('@') or line.strip().startswith('async def') or line.strip().startswith('def'):
            in_function = True
            func_lines.append(line)
            if 'def ' in line:
                # Get indent level of function def
                indent_level = len(line) - len(line.lstrip())
        elif in_function:
            # Check if we've reached the next function
            if line.strip().startswith('@') and indent_level is not None:
                break
            if line.strip().startswith('def ') or line.strip().startswith('async def'):
                # Check if it's at the same or lower indent level (new function)
                current_indent = len(line) - len(line.lstrip())
                if current_indent <= indent_level:
                    break
            func_lines.append(line)
        
        i += 1
        
        # Stop at next top-level definition or comment section
        if in_function and line.strip() and not line.strip().startswith('#'):
            if i < len(lines) and lines[i].strip().startswith('# ') and lines[i].strip().endswith('endpoints'):
                break
    
    return func_lines, i

def main():
    with open('server.py', 'r') as f:
        lines = f.readlines()
    
    # Find all route decorators
    routes_data = defaultdict(list)
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Match route decorator
        if re.match(r'^@(api_router|app)\.(get|post|put|delete|patch)\(', line):
            path_match = re.search(r'["\'](/[^"\']*)["\']', line)
            if path_match:
                path = path_match.group(1)
                
                # Extract function body
                func_body, next_i = extract_function_body(lines, i + 1)
                
                # Determine group from path
                path_parts = path.strip('/').split('/')
                group = path_parts[0] if path_parts and path_parts[0] else 'root'
                
                # Map groups to route files
                route_file_map = {
                    'auth': 'auth_routes',
                    'deals': 'deal_routes',
                    'contacts': 'contact_routes',
                    'api': 'team_routes',  # Team routes use /api/teams
                    'team': 'team_routes',
                    'email': 'email_routes',
                    'pipelines': 'pipeline_routes',
                    'stages': 'pipeline_routes',
                    'parcels': 'map_routes',
                    'layers': 'map_routes',
                    'address-search': 'map_routes',
                    'intelligence': 'map_routes',
                    'dashboard': 'dashboard_routes',
                    'chat': 'chat_routes',
                    'users': 'user_routes',
                    'share': 'share_routes',
                }
                
                target_file = route_file_map.get(group, f'{group}_routes')
                
                routes_data[target_file].append({
                    'path': path,
                    'body': func_body,
                    'group': group,
                    'line': i
                })
                
                i = next_i
        else:
            i += 1
    
    # Print summary
    print("\\n📊 Route Extraction Summary:")
    print("=" * 60)
    total_routes = sum(len(routes) for routes in routes_data.values())
    print(f"Total routes found: {total_routes}")
    print(f"Route files to create: {len(routes_data)}\\n")
    
    for filename, routes in sorted(routes_data.items(), key=lambda x: -len(x[1])):
        print(f"  {filename:25} → {len(routes):2} routes")
    
    print("\\n" + "=" * 60)
    
    # Save route mapping for next step
    import json
    with open('route_extraction_map.json', 'w') as f:
        # Convert to serializable format
        export_data = {}
        for filename, routes in routes_data.items():
            export_data[filename] = [{
                'path': r['path'],
                'group': r['group'],
                'line': r['line'],
                'body_lines': len(r['body'])
            } for r in routes]
        json.dump(export_data, f, indent=2)
    
    print("\\n✅ Route mapping saved to route_extraction_map.json")
    return routes_data

if __name__ == '__main__':
    routes = main()
