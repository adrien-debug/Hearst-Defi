from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # On essaie d'accéder directement à la page portfolio. 
        # Si une redirection vers login a lieu, on le verra.
        page.goto('http://localhost:4105/portfolio')
        page.wait_for_load_state('networkidle')
        
        # Take a screenshot
        screenshot_path = 'portfolio_scan.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")
        print(f"Final URL: {page.url}")
        
        browser.close()

if __name__ == "__main__":
    run()
