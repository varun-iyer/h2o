import {isBlockLevel,
        isBR,
        isText,
        getLength,
        getAttrsMap,
        getClosestElement} from 'libs/html_helpers';

const parseNode = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.children[0];
};

describe('isBlockLevel', () => {
  test('returns true when passed a block element', () => {
    expect(isBlockLevel(document.createElement('div'))).toBeTruthy();
  });

  test('returns false when passed an inline element', () => {
    expect(isBlockLevel(document.createElement('span'))).toBeFalsy();
  });
});

describe('isBR', () => {
  test('returns true when passed a br element', () => {
    expect(isBR(document.createElement('br'))).toBeTruthy();
  });

  test('returns false when passed a non-br element', () => {
    expect(isBR(document.createElement('span'))).toBeFalsy();
  });
});

describe('isText', () => {
  test('returns true when passed a text node', () => {
    expect(isText(document.createTextNode('hello world'))).toBeTruthy();
  });

  test('returns false when passed a non-text node', () => {
    expect(isText(document.createElement('span'))).toBeFalsy();
  });
});

describe('getLength', () => {
  // Skipped because the default Jest engine, jsdom, doesn't implement innerText
  test.skip('returns correct text length for an element and its nested nodes', () => {
    expect(getLength(parseNode('<div>Hello <em>W</em>orld</div>'))).toBe(11);
  });

  test('returns correct text length for a text node', () => {
    expect(getLength(document.createTextNode('hello world'))).toBe(11);
  });

  test('returns 0 a <br> element rather than 1, which is what innerText returns because it\s read as whitespace', () => {
    expect(getLength(document.createElement('br'))).toBe(0);
  });
});

describe('getAttrsMap', () => {
  test('returns all attributes from an element as a map', () => {
    expect(getAttrsMap(parseNode('<div id="foo" class="bar">Hello world</div>'))).toEqual({id: "foo", class: "bar"});
  });
});

describe('getClosestElement', () => {
  test('returns the same node when passed an element', () => {
    const el = document.createElement('div');
    expect(getClosestElement(el)).toBe(el);
  });

  test('returns the parent element when passed a text node', () => {
    const el = parseNode('<div>Hello world</div>');
    expect(getClosestElement(el.childNodes[0])).toBe(el);
  });
});
