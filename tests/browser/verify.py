import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

url = os.environ.get('NO_SUBAGENT_POPUP_TEST_URL', 'http://127.0.0.1:15189/no-subagent-popup-fixture.html')
output = Path(os.environ.get('NO_SUBAGENT_POPUP_TEST_OUTPUT', '/root/.hermes/cache/scratch/no-subagent-popup-discovery/browser'))
output.mkdir(parents=True, exist_ok=True)
result = {'url': url, 'checks': [], 'errors': []}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1200, 'height': 760}, device_scale_factor=1)
    page.on('pageerror', lambda error: result['errors'].append(str(error)))
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=60000)
        children = page.locator('[data-slot="sidebar-running-subagent"]')
        children.first.wait_for(timeout=90000)
        assert children.count() == 2, children.count()
        wrapper = page.locator('[data-slot="sidebar-session-with-subagents"]')
        assert wrapper.count() == 1
        result['checks'].append('actual SidebarSessionRow nests two live children')
        expanded_height = wrapper.bounding_box()['height']
        toggle = page.get_by_role('button', name='Running subagents', exact=True)
        toggle.click()
        assert children.count() == 0
        assert toggle.get_attribute('aria-expanded') == 'false'
        collapsed_height = wrapper.bounding_box()['height']
        assert expanded_height > collapsed_height, (expanded_height, collapsed_height)
        toggle.click()
        assert children.count() == 2
        result['checks'].append('dropdown collapses/expands and parent layout height follows content')
        color = children.first.evaluate('(el) => getComputedStyle(el).color')
        assert '0.956863' in color or '244' in color, color
        page.screenshot(path=str(output / 'nested-running-subagents-dark.png'), full_page=True)
        page.get_by_role('button', name='Watch subagent: Inspect alpha', exact=True).click()
        status = page.evaluate('window.fixture.status()')
        assert status == {'popupCount': 0, 'watch': True, 'hash': '#/child-alpha'}, status
        result['checks'].append('sidebar click routes same window and enables read-only spectator guard, zero popup calls')
        page.locator('section').get_by_role('button', name='Inspect beta', exact=True).click()
        status = page.evaluate('window.fixture.status()')
        assert status == {'popupCount': 0, 'watch': True, 'hash': '#/child-beta'}, status
        result['checks'].append('existing delegation card routes to corresponding child without popup')
        page.evaluate('window.fixture.complete("alpha")')
        page.wait_for_function('document.querySelectorAll("[data-slot=sidebar-running-subagent]").length === 1')
        assert page.get_by_role('button', name='Watch subagent: Inspect beta', exact=True).count() == 1
        page.evaluate('window.fixture.complete("beta")')
        page.wait_for_function('!document.querySelector("[data-slot=sidebar-live-subagents]")')
        assert page.locator('section').get_by_role('button', name='Inspect beta', exact=True).count() == 1
        result['checks'].append('terminal children/dropdown disappear automatically; transcript cards remain')
        page.evaluate('window.fixture.disable()')
        page.wait_for_function('!document.querySelector("[data-slot=sidebar-session-with-subagents]")')
        page.locator('section').get_by_role('button', name='Inspect beta', exact=True).click()
        page.wait_for_function('window.__popupCount === 1')
        result['checks'].append('plugin unload restores unmodified sidebar and original popup handler')
        assert not result['errors'], result['errors']
        result['passed'] = True
    except Exception as exc:
        result['passed'] = False
        result['failure'] = repr(exc)
        result['body'] = page.locator('body').inner_text()[:5000]
        page.screenshot(path=str(output / 'failure.png'), full_page=True)
    browser.close()
(output / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
raise SystemExit(0 if result.get('passed') else 1)
