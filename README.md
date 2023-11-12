# Efficient Rect Packer

## Description

Efficient Rect Packer is a powerful and efficient 2D bin packing algorithm designed for the optimal arrangement of rectangular items within a fixed-size container or sheet. This library is particularly useful for a wide range of applications where efficient space utilization is key, such as in material cutting, shelf space allocation, or any scenario that requires packing a bunch of rectangles as efficiently as possible within a fixed size container. The algorithm used in this library is based on research by Mao Chen, which can be found [here](https://www.intechopen.com/chapters/5850).

## Features

- **Efficient Packing Algorithm**: Efficiently packs rectangles inside a container of fixed dimensions. 
- **Customizable Options**: Supports padding, margins, and rotation settings for rectangles.
- **Easy to Use**: Simple and intuitive API.

## Installation

Install the package using npm:
```bash
npm install efficient-rect-packer
```
Or using yarn:
```bash
yard add efficient-rect-packer
```

## Usage
Here's a quick example to get you started:

```ts
import { pack } from 'efficient-rect-packer';

const rectangles = [
    { id: 'rect1', w: 100, h: 200 },
    { id: 'rect2', w: 150, h: 100 },
    // ... more rectangles ...
];

const containerSize = { w: 500, h: 500 };

const options = {
    padding: 10,
    margin: { top: 5, right: 5, bottom: 5, left: 5 },
    noRotation: false
};

pack(rectangles, containerSize, options)
    .then(result => {
        console.log(result);
    })
    .catch(error => {
        console.error(error);
    });

```

## Example Output
Given the above example, the output might look like this:
```json
{
    "packed_rectangles": [
        { "id": "rect1", "w": 100, "h": 200, "x": 5, "y": 5, "rotated": false },
        { "id": "rect2", "w": 150, "h": 100, "x": 115, "y": 5, "rotated": true },
        { "id": "rect3", "w": 200, "h": 150, "x": 275, "y": 5, "rotated": false }
    ],
    "unpacked_rectangles": [],
    "isRemaining": false,
    "error": null
}
```

## Demo
A practical application of this library is an online tool for efficiently packing images onto A4-sized paper for printing. This tool helps to minimize the number of pages required to print all the photos, saving paper and reducing printing costs. You can check out the demo [here](https://2d-bin-packing.vercel.app/).

## API Reference

### `pack(rects, container_size, options)`

- `rects`: Array of `UnpackedRect` objects (each having `id`, `w`, `h`).
- `container_size`: `Dimension` object specifying the width (`w`) and height (`h`) of the container.
- `options`: (Optional) `Options` object.
  - `padding`: (Optional) Number specifying padding between rectangles.
  - `margin`: (Optional) `Margin` object specifying top, right, bottom, and left margins.
  - `noRotation`: (Optional) Boolean to disable rotation of rectangles.





