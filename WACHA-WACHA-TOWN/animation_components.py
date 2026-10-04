"""Separate intact sprites whose row bounding boxes overlap, without painting.

Opt-in recovery for tightly packed generated sheets. Source PNGs are never edited.
Returned cells retain one coordinate frame per complete row, so the caller can
apply the same affine registration to every animation pose.
"""
from collections import deque
import numpy as np
from PIL import Image
from sprite_layout import character_columns


def component_cells(image, rows, cols, fringe=3):
    """Try column separation, then whole-sheet components for uneven columns."""
    try:
        return _column_component_cells(image, rows, cols, fringe)
    except ValueError as error:
        result, boxes, diagnostic = _global_component_cells(image, rows, cols, fringe)
        diagnostic['columnFallbackReason'] = str(error)
        return result, boxes, diagnostic


def _global_component_cells(image, rows, cols, fringe=3):
    """Recover irregularly spaced complete sprites using their original pixels.

    No character is cut into an assumed column before connected components are
    found. Major component counts and row membership are exact requirements.
    Small disconnected opaque parts must be close to a body; otherwise fail.
    """
    rgba = np.asarray(image.convert('RGBA'))
    height, width = rgba.shape[:2]
    alpha = rgba[:, :, 3]
    points = set(map(tuple, np.argwhere(alpha > 120)))
    groups = []
    while points:
        first = points.pop()
        queue, group = deque([first]), [first]
        while queue:
            y, x = queue.popleft()
            for point in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                if point in points:
                    points.remove(point)
                    queue.append(point)
                    group.append(point)
        groups.append(group)
    min_pixels = max(100, width*height/rows/cols*.025)
    bodies = [g for g in groups if len(g) >= min_pixels]
    if len(bodies) != rows*cols:
        raise ValueError(f'global components: expected {rows*cols} intact sprites, got {len(bodies)}')
    by_row = [[] for _ in range(rows)]
    for group in bodies:
        cy = sum(y for y,x in group)/len(group)
        row = min(rows-1, int(cy*rows/height))
        by_row[row].append(group)
    for row, row_groups in enumerate(by_row):
        if len(row_groups) != cols:
            raise ValueError(f'global row {row+1}: expected {cols}, got {len(row_groups)}')
        row_groups.sort(key=lambda g: sum(x for y,x in g)/len(g))
    bodies = [g for row in by_row for g in row]
    boxes = []
    labels = np.zeros(alpha.shape, dtype=np.uint16)
    front = []
    for index, group in enumerate(bodies):
        a = np.asarray(group)
        boxes.append((int(a[:,1].min()), int(a[:,0].min()), int(a[:,1].max())+1, int(a[:,0].max())+1))
        for y,x in group:
            labels[y,x] = index+1
            front.append((y,x,index+1))
    # Attach only genuine adjacent fragments (e.g. separated hat trim) and
    # leave distant pixels unassigned for the strict diagnostic below.
    for group in groups:
        if len(group) >= min_pixels:
            continue
        a = np.asarray(group)
        x0,y0,x1,y1 = int(a[:,1].min()),int(a[:,0].min()),int(a[:,1].max())+1,int(a[:,0].max())+1
        distances = [max(0,b[0]-x1,x0-b[2])**2 + max(0,b[1]-y1,y0-b[3])**2 for b in boxes]
        index = int(np.argmin(distances))
        if distances[index] <= (fringe+2)**2:
            for y,x in group:
                labels[y,x] = index+1
                front.append((y,x,index+1))
    for _ in range(fringe):
        next_front=[]
        for y,x,label in front:
            for ny,nx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1),(y+1,x+1),(y+1,x-1),(y-1,x+1),(y-1,x-1)):
                if 0 <= ny < height and 0 <= nx < width and labels[ny,nx] == 0:
                    labels[ny,nx]=label
                    next_front.append((ny,nx,label))
        front=next_front
    discarded=int(((labels==0)&(alpha>120)).sum())
    if discarded>max(24,int((alpha>120).sum()*.002)):
        raise ValueError(f'global components: {discarded} unassigned opaque pixels')
    result, source_boxes=[],[]
    for row in range(rows):
        masks=[];bounds=[]
        for col in range(cols):
            select=(labels==row*cols+col+1)&(alpha>0)
            yy,xx=np.nonzero(select)
            bounds.append([int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1])
            masks.append(select)
        top=min(b[1] for b in bounds);bottom=max(b[3] for b in bounds)
        centers=[(b[0]+b[2])/2 for b in bounds]
        separators=[0]+[round((a+b)/2) for a,b in zip(centers,centers[1:])]+[width]
        cell_width=max(max(separators[i+1],bounds[i][2])-min(separators[i],bounds[i][0]) for i in range(cols))
        row_cells=[];row_boxes=[]
        for col,select in enumerate(masks):
            left=min(separators[col],bounds[col][0]);right=max(separators[col+1],bounds[col][2])
            pixels=rgba[top:bottom,left:right].copy()
            pixels[~select[top:bottom,left:right]]=0
            cell=Image.new('RGBA',(cell_width,bottom-top))
            cell.alpha_composite(Image.fromarray(pixels),((cell_width-(right-left))//2,0))
            row_cells.append(cell);row_boxes.append([left,top,right,bottom])
        result.append(row_cells);source_boxes.append(row_boxes)
    return result,source_boxes,{'method':'whole-sheet connected components, row-count checked, original pixels only',
                               'majorComponents':len(bodies),'discardedOpaqueSpecks':discarded,'fringePixels':fringe}


def _column_component_cells(image, rows, cols, fringe=3):
    """Return (row_cells, source_boxes, diagnostics) using original RGBA pixels.

    row_cells[row][column] are same-size PIL RGBA images within each row.
    source_boxes[row][column] are original source crop boxes. A component mask,
    not the box alone, is required to keep the adjacent row out of these crops.
    Raises ValueError rather than silently accepting missing or joined people.
    """
    image = image.convert('RGBA')
    rgba = np.asarray(image)
    height, width = rgba.shape[:2]
    xs = character_columns(rgba[:, :, 3], cols)
    blocks = [[] for _ in range(rows)]
    boxes = [[] for _ in range(rows)]
    diagnostics = {'method': 'opaque connected components with original antialias fringe',
                   'fringePixels': fringe, 'columns': []}
    for col, (x0, x1) in enumerate(zip(xs, xs[1:])):
        block = rgba[:, x0:x1].copy()
        alpha = block[:, :, 3]
        points = set(map(tuple, np.argwhere(alpha > 120)))
        groups = []
        min_pixels = max(100, height * (x1-x0) / rows * .02)
        while points:
            first = points.pop()
            queue, group = deque([first]), [first]
            while queue:
                y, x = queue.popleft()
                for point in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                    if point in points:
                        points.remove(point)
                        queue.append(point)
                        group.append(point)
            if len(group) >= min_pixels:
                groups.append(group)
        if len(groups) != rows:
            raise ValueError(f'column {col+1}: expected {rows} distinct intact sprites, got {len(groups)}')
        groups.sort(key=lambda group: sum(p[0] for p in group)/len(group))
        labels = np.zeros(alpha.shape, dtype=np.uint16)
        front = []
        for row, group in enumerate(groups):
            cy = sum(p[0] for p in group)/len(group)
            if not row*height/rows <= cy < (row+1)*height/rows:
                raise ValueError(f'column {col+1}, row {row+1}: component outside expected row')
            for y, x in group:
                labels[y, x] = row+1
                front.append((y, x, row+1))
        for _ in range(fringe):
            next_front = []
            for y, x, label in front:
                for ny, nx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1),(y+1,x+1),(y+1,x-1),(y-1,x+1),(y-1,x-1)):
                    if 0 <= ny < height and 0 <= nx < x1-x0 and labels[ny,nx] == 0:
                        labels[ny,nx] = label
                        next_front.append((ny,nx,label))
            front = next_front
        discarded = int(((labels == 0) & (alpha > 120)).sum())
        if discarded > max(24, (alpha > 120).sum()*.002):
            raise ValueError(f'column {col+1}: {discarded} unassigned opaque pixels; manual review required')
        diagnostics['columns'].append({'column':col,'majorComponents':len(groups),
                                        'discardedOpaqueSpecks':discarded})
        for row in range(rows):
            select = (labels == row+1) & (alpha > 0)
            yy, xx = np.nonzero(select)
            box = [x0+int(xx.min()), int(yy.min()), x0+int(xx.max())+1, int(yy.max())+1]
            pixels = block.copy()
            pixels[~select] = 0
            blocks[row].append((Image.fromarray(pixels), x0, x1))
            boxes[row].append(box)
    result, source_boxes = [], []
    for row in range(rows):
        top = min(box[1] for box in boxes[row])
        bottom = max(box[3] for box in boxes[row])
        cell_width = max(x1-x0 for _,x0,x1 in blocks[row])
        row_cells, row_boxes = [], []
        for block,x0,x1 in blocks[row]:
            cell = Image.new('RGBA',(cell_width,bottom-top))
            cell.alpha_composite(block.crop((0,top,x1-x0,bottom)),((cell_width-(x1-x0))//2,0))
            row_cells.append(cell)
            row_boxes.append([x0,top,x1,bottom])
        result.append(row_cells)
        source_boxes.append(row_boxes)
    return result, source_boxes, diagnostics
