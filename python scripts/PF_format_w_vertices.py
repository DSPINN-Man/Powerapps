import math
import matplotlib.pyplot as plt
import pandas as pd
from openpyxl import load_workbook
import os
import sys
import mpld3

# *** To edit the number of levels, navigate to line ~370 in the code below ***

# ---------------------------------------------------------------------
# 1) SCRIPT CONFIGURATIONS
# ---------------------------------------------------------------------

# INPUT: File name of Impedence Loci vertices in Excel format (must include .xlsx/.xlsm)
loci_file = 'Loci_Script_Inputs.xlsm'

# INPUT: Excel sheet name where the matrix of vertices is located
sheet_name = 'Impedance Loci Vertices'

# INPUT: Desired name of output folder (where resulting data points and graphs will be stored)
output_folder = 'Mins & Maxes (w Vertices) (ohms)'

# INPUT: Use Excel for data? (If yes: True) (If no: False)
exdata = True

# INPUT: Reorder vertices? 
# ONLY True if vertices are out of order and all shapes are NOT concave
# IF False: vertices must be in proper order in Excel sheet with the first vertex repeated as last vertex
reorder = False

# INPUT: Impedance Loci data points if Excel is not used
# (This is only relevant if exdata=False.)
ranges = [16.5, 20.5, 20.5, 24.5]
Impedance_Loci = [
    [0.630, 6.990, 0.630, 7.500],
    [0.630, 8.060, 0.630, 8.060],
    [0.740, 8.810, 0.850, 9.530],
    [1.000, 8.810, 1.040, 9.530],
    [1.000, 6.990, 1.040, 7.500],
    [0.630, 6.990, 0.630, 7.500]
]
range_count = len(Impedance_Loci[0]) / 2

# INPUT: Inserted data's units ('pu' or 'ohm')
Loci_unit = 'ohm'

# Input: Enter the digits after the decimal to round to (5 or fewer recommended)
decimalrounding = 5


# ---------------------------------------------------------------------
# 2) FUNCTIONS
# ---------------------------------------------------------------------

def excel_to_matrix(loci_file, sheet_name):
    """
    Reads matrix of vertices from an Excel file/sheet.
    The first row is treated as 'ranges',
    and subsequent rows are the vertex data.
    """
    df = pd.read_excel(loci_file, sheet_name=sheet_name, header=None)
    Impedance_Loci = df.values.tolist()
    # 'ranges' = first row, the rest are vertices
    ranges = Impedance_Loci[0:1]  
    Impedance_Loci = Impedance_Loci[1:]
    range_count = len(Impedance_Loci[0]) / 2
    return Impedance_Loci, range_count, ranges

def linear_interpolate(x, xp, fp):
    """Simple linear interpolation."""
    n = len(xp)
    result = []
    for val in x:
        for i in range(1, n):
            if xp[i-1] <= val <= xp[i]:
                slope = (fp[i] - fp[i-1]) / (xp[i] - xp[i-1])
                result.append(fp[i-1] + slope*(val - xp[i-1]))
                break
    return result

def linspace(start, stop, num):
    """Equivalent to numpy.linspace for integer num steps."""
    step = (stop - start) / (num - 1)
    return [start + step * i for i in range(num)]

def convert_to_2d_list(array):
    """Convert a nested structure to standard Python lists."""
    return [list(row) for row in array]

def print_table(headers, data):
    """Print a Markdown-like table in terminal."""
    col_widths = [max(len(str(item)) for item in col) 
                  for col in zip(*([headers] + data))]
    row_format = " | ".join(["{:<" + str(width) + "}" for width in col_widths])
    # Header
    print("|" + row_format.format(*headers) + "|")
    print("|" + "-" * (sum(col_widths) + 3*(len(headers) - 1)) + "|")
    # Rows
    for row in data:
        print("|" + row_format.format(*row) + "|")

def write_table(headers, data):
    """Return a Markdown-like table as a string."""
    ret = ''
    col_widths = [max(len(str(item)) for item in col) 
                  for col in zip(*([headers] + data))]
    row_format = " | ".join(["{:<" + str(width) + "}" for width in col_widths])
    # Header
    ret += "|" + row_format.format(*headers) + "|\n"
    ret += "|" + "-" * (sum(col_widths) + 3*(len(headers) - 1)) + "|\n"
    # Rows
    for row in data:
        ret += "|" + row_format.format(*row) + "|\n"
    return ret

def vertices_left_out(R_pu, X_pu, matrix):
    """
    Return vertices not initially included in the data points.
    (Typically not used in main workflow by default.)
    """
    vertices = {}
    inorout = {}
    counter1 = 0
    for heights in X_pu:
        vertices[heights] = R_pu[counter1]
        inorout[heights] = False
        for vert in matrix:
            if vert[0] == heights:
                inorout[heights] = True
        counter1 += 1
    points_list = []
    for point, value in inorout.items():
        if value is False:
            points_list.append((vertices[point], point))
    return points_list

def calculate_distance(point1, point2):
    """Euclidean distance between two points (x1,y1) and (x2,y2)."""
    return math.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)

def get_polygon_perimeter(vertices):
    """Calculate the perimeter of a polygon given ordered vertices."""
    perimeter = 0
    for i in range(len(vertices)):
        next_index = (i + 1) % len(vertices)
        perimeter += calculate_distance(vertices[i], vertices[next_index])
    return perimeter

def get_equally_spaced_points_on_perimeter(vertices, num_points):
    """
    Distribute num_points equally along the perimeter of a polygon 
    given in connecting order.
    """
    perimeter = get_polygon_perimeter(vertices)
    segment_length = perimeter / num_points
    points = []
    current_index = 0
    carryover = 0

    while len(points) < num_points:
        start = vertices[current_index]
        next_index = (current_index + 1) % len(vertices)
        end = vertices[next_index]
        distance = calculate_distance(start, end)
        remaining_length = carryover + distance

        while remaining_length >= segment_length:
            remaining_length -= segment_length
            ratio = (distance - remaining_length) / distance
            new_point = (
                start[0] + ratio * (end[0] - start[0]),
                start[1] + ratio * (end[1] - start[1])
            )
            points.append(new_point)
            if len(points) == num_points:
                break
        carryover = remaining_length
        current_index = next_index

    return points

def polygon_area(vertices):
    """Shoelace formula for polygon area."""
    n = len(vertices)
    if n < 3:
        return 0  
    area = 0
    for i in range(n):
        x1, y1 = vertices[i]
        x2, y2 = vertices[(i + 1) % n]
        area += x1*y2 - y1*x2
    return abs(area) / 2

def inner_points(delta, datamatrix, option):
    """
    Create internal points at intervals of delta along each row of datamatrix. 
    (Used in advanced polygon fill.)
    """
    innerds = []
    for row in datamatrix[1:len(datamatrix)-1]:
        newR = row[1]
        row_distance = row[2] - row[1]
        counter = 0
        while newR < row[2]:
            if (row[2] - newR) < (2 * delta) and option == 2:
                counter -= 1
            counter += 1
            newR += delta
        try:
            line_delta = row_distance / counter
        except:
            continue
        rowR = row[1] + line_delta
        while round(rowR, 10) < round(row[2], 10):
            innerds.append((rowR, row[0]))
            rowR += line_delta
    return innerds

def filter_points_in_polygon(polygon_vertices, points):
    """Return only the subset of 'points' that lie inside 'polygon_vertices'."""
    return [pt for pt in points if is_point_in_polygon(pt[0], pt[1], polygon_vertices)]

def is_point_in_polygon(x, y, polygon):
    """
    Ray casting to detect if (x, y) is inside the polygon (list of (x_i, y_i)).
    """
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y)*(p2x - p1x)/(p2y - p1y) + p1x
                    else:
                        xinters = p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def find_min_max_x_at_height(x_vertices, y_vertices, height, epsilon=1e-9):
    """
    For a polygon defined by x_vertices[i], y_vertices[i],
    return (min_x, max_x) where it intersects a horizontal line at 'height'.
    """
    min_x = float('inf')
    max_x = float('-inf')
    num_vertices = len(x_vertices)
    for i in range(num_vertices - 1):
        x1, y1 = x_vertices[i], y_vertices[i]
        x2, y2 = x_vertices[i + 1], y_vertices[i + 1]
        
        # Check if line from y1->y2 intersects horizontal 'height'
        if (y1 - height)*(y2 - height) <= epsilon:
            if abs(y1 - y2) > epsilon:
                # linear interpolation
                x_at_height = x1 + (x2 - x1)*(height - y1)/(y2 - y1)
            else:
                x_at_height = x1
            min_x = min(min_x, x_at_height)
            max_x = max(max_x, x_at_height)
    return min_x, max_x

# ---------------------------------------------------------------------
# 2A) NEW FUNCTION: Sort points clockwise & repeat first at end
# ---------------------------------------------------------------------

def sort_points_clockwise(points):
    """
    Sort a list of (x, y) points in clockwise order, 
    then append the first point to the end to 'close' the shape.
    """
    # 1) Compute centroid
    cx = sum(p[0] for p in points) / len(points)
    cy = sum(p[1] for p in points) / len(points)
    
    # 2) Sort in descending angle order w.r.t. centroid => clockwise
    def angle_from_centroid(pt):
        dx = pt[0] - cx
        dy = pt[1] - cy
        return math.atan2(dy, dx)
    
    points_sorted = sorted(points, key=angle_from_centroid, reverse=True)

    # 3) Append the first point again at the end
    if points_sorted:
        points_sorted.append(points_sorted[0])
    return points_sorted

# ---------------------------------------------------------------------
# 3) MAIN SCRIPT
# ---------------------------------------------------------------------

cwd = os.path.dirname(os.path.abspath(sys.argv[0]))
new_folder_path = os.path.join(cwd, output_folder)
os.makedirs(new_folder_path, exist_ok=True)

counterlevels = 0

# If exdata == True, read the locus data from the Excel file
if exdata:
    try:
        Impedance_Loci, range_count, ranges = excel_to_matrix(loci_file, sheet_name)
    except:
        print('Excel file name or sheet name not found.')
        quit()

# For each “Calculation_Range” in the matrix:
for Calculation_Range in range(1, int(range_count) + 1):
    print()
    
    # Re-read from Excel in each loop (if exdata=True)
    if exdata:
        Impedance_Loci, range_count, ranges = excel_to_matrix(loci_file, sheet_name)
        # 'ranges' is nested, so we extract the first row
        ranges = ranges[0]

    # Extract R_pu and X_pu for the selected Calculation_Range
    R_pu = []
    X_pu = []
    for row in Impedance_Loci:
        # 2*(Calc_Range-1) is the R column, 2*(Calc_Range-1)+1 is the X column
        if not math.isnan(row[2*(Calculation_Range-1)]) and not math.isnan(row[2*(Calculation_Range-1)+1]):
            R_pu.append(row[2*(Calculation_Range-1)])
            X_pu.append(row[2*(Calculation_Range-1)+1])

    # --------------------------------------------------------------
    # Reorder the points if needed (clockwise + repeat first point)
    if reorder:
        combined_points = list(zip(R_pu, X_pu))
        reordered = sort_points_clockwise(combined_points)
        # Overwrite R_pu and X_pu with the newly sorted/closed shape
        R_pu = [pt[0] for pt in reordered]
        X_pu = [pt[1] for pt in reordered]

    # Prepare list of vertices
    verts = list(zip(R_pu, X_pu))

    # Create grid of y values (levels)
    y_min = min(X_pu)
    y_max = max(X_pu)
    
    # Decide how many levels to generate based on # of vertices
    if len(X_pu) < 10:
        levels = 20
    elif len(X_pu) < 20:
        levels = 16
    elif len(X_pu) < 30:
        levels = 12
    elif len(X_pu) < 40:
        levels = 8
    else:
        levels = 7

    y_grid = linspace(y_min, y_max, levels)

    vertices = {}
    inorout = {}
    counter1 = 1
    counterlevels = 0
    # Mark each vertex to see if it corresponds to a level
    for heights in X_pu[1:len(X_pu)]:
        vertices[heights] = R_pu[counter1]
        inorout[heights] = False
        for height in y_grid:
            if round(height, 10) == round(heights, 10):
                inorout[heights] = True
        counter1 += 1
    points_list = []
    for point, value in inorout.items():
        if value is False:
            points_list.append(point)
            counterlevels += 1
    y_grid += points_list
    y_grid.sort()
    
    # Initialize arrays for x-min and x-max values
    x_min_vals = [0]*len(y_grid)
    x_max_vals = [0]*len(y_grid)

    # For each height in y_grid, find min and max R
    for i, height in enumerate(y_grid):
        x_min_vals[i], x_max_vals[i] = find_min_max_x_at_height(R_pu, X_pu, height)

    # DS_Format structure
    # First row is [-9999.0, RangeStart, RangeEnd]
    DS_Format = [[-9999.0, ranges[2*(Calculation_Range-1)], ranges[2*(Calculation_Range-1)+1]]]
    DS_Format += [[y_grid[i], x_min_vals[i], x_max_vals[i]] 
                  for i in range(len(y_grid))]

    # Round data
    rounded_DS_Format = [[round(num, decimalrounding) for num in row] 
                         for row in DS_Format]

    # Prepare for Excel/printing
    headers = ['X(' + Loci_unit + ')', 'R_min(' + Loci_unit + ')', 'R_max(' + Loci_unit + ')']
    excel_output_name = (str(ranges[2*(Calculation_Range-1)])
                         + "-" + str(ranges[2*(Calculation_Range-1)+1])
                         + '_data_points.xlsx')
    excl_path = os.path.join(new_folder_path, excel_output_name)
    dfoutput = pd.DataFrame(rounded_DS_Format, columns=headers)

    # Write to new Excel file in output folder
    try:
        dfoutput.to_excel(excl_path, sheet_name='Sheet1', index=False, engine='xlsxwriter')
    except ModuleNotFoundError:
        try:
            dfoutput.to_excel(excl_path, sheet_name='Sheet1', index=False, engine='openpyxl')
        except ModuleNotFoundError:
            dfoutput.to_excel(excl_path, sheet_name='Sheet1', index=False)
            print("Warning: Excel engine modules not found. Using default engine.")

    print(f"Range: {ranges[2*(Calculation_Range-1)]} - {ranges[2*(Calculation_Range-1)+1]}")
    print(f"\t{levels + counterlevels} levels created with mins and maxes saved in DS format")
    # print_table(headers, rounded_DS_Format) # uncomment to see table in console

    # Plot the results
    plt_name = (f"plot_{ranges[2*(Calculation_Range-1)]}"
                f"-{ranges[2*(Calculation_Range-1)+1]}_output.html")
    plt_path = os.path.join(new_folder_path, plt_name)

    plt.figure(figsize=(10, 6))
    plt.plot(R_pu, X_pu, 'b-', linewidth=1.5, label='Impedance Loci')

    # Collect min/max points for display
    datamatrix = DS_Format[1:]
    xpoints = []
    ypoints = []
    for row in datamatrix:
        xpoints.append(row[1])  # min
        ypoints.append(row[0])
        xpoints.append(row[2])  # max
        ypoints.append(row[0])
    plt.scatter(xpoints, ypoints, color='red', marker='o', s=5, label='All Points')
    
    # Connect each row's min->max with a line
    for i in range(int(len(xpoints)/2)):
        i2 = i * 2
        plt.plot(xpoints[i2:i2+2], ypoints[i2:i2+2], 'r-', linewidth=1.0)

    plt.xlabel('R(pu)')
    plt.ylabel('X(pu)')
    title = (f"Harmonic Orders: {ranges[2*(Calculation_Range-1)]}"
             f" - {ranges[2*(Calculation_Range-1)+1]}  |  "
             f"{levels + counterlevels} Levels.")
    plt.title(title)
    plt.grid(True)

    with open(plt_path, 'w') as f:
        f.write(mpld3.fig_to_html(plt.gcf()))
    plt.close()
    plt.show()

# Summary of the entire run
print('\nInput Information:')
print(f'\tDS_Formats and plots located under folder: "{output_folder}"')
if exdata:
    print(f'\tImpedance Loci data extracted from Excel sheet: {loci_file}, {sheet_name}')
else:
    print('\tImpedance Loci data used directly from code variables.')
print(f'\tImpedance Loci input units: {Loci_unit}')
print('\tDS_Formats created with a level at every vertex and some additional equidistant levels')
print(f'\tOutputs printed to {decimalrounding} decimal places\n')
