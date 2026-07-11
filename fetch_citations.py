import urllib.request, json, urllib.parse

queries = [
    'software engineering tool developers cognitive load', 
    'computer science graduates tech skills gap', 
    'generative ai chatgpt programming education'
]

results = []
for q in queries:
    url = f"https://api.crossref.org/works?query={urllib.parse.quote(q)}&select=title,author,URL,published-print,issued,container-title&rows=2&sort=relevance"
    req = urllib.request.Request(url, headers={'User-Agent': 'ThesisBot/1.0 (mailto:test@example.com)'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            items = data.get('message', {}).get('items', [])
            for item in items:
                authors = [a.get('family', '') + ' ' + a.get('given', '') for a in item.get('author', [])][:3]
                titles = item.get('title', [])
                title = titles[0] if titles else 'No Title'
                journals = item.get('container-title', [])
                journal = journals[0] if journals else 'Conference/Other'
                
                # Try to safely get the year
                year = 2023
                try:
                    year = item.get('issued', {}).get('date-parts', [[2023]])[0][0]
                except:
                    pass
                
                url_str = item.get('URL', '')
                results.append({
                    "title": title,
                    "authors": authors,
                    "journal": journal,
                    "year": year,
                    "url": url_str
                })
    except Exception as e:
        pass

with open("crossref_results_2.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=4)
