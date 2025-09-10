import math
import pandas as pd
import numpy as np

def sort_points_clockwise(points):
    """
    Sorts a list of (r, x) points in descending angle order (clockwise)
    around their centroid, then appends the first point at the end to
    close the shape.
    """
    if not points:
        return []
    cx = sum(p[0] for p in points) / len(points)
    cy = sum(p[1] for p in points) / len(points)
    # Sort in descending order of angle => clockwise
    points_sorted = sorted(
        points,
        key=lambda p: math.atan2(p[1] - cy, p[0] - cx),
        reverse=True
    )
    # Repeat first point at the end
    points_sorted.append(points_sorted[0])
    return points_sorted

def main():
    # -------------------------------------------------------------------
    # 1) CONFIGURATION
    # -------------------------------------------------------------------
    # Input Excel file
    input_file = 'Loci_Script_Inputs.xlsm'
    # Output Excel file
    output_file = 'Loci_Script_Inputs_Clockwise.xlsx'

    # Excel sheet name containing the data
    sheet_name = 'Impedance Loci Vertices'
    
    # Do you have a header row in the sheet that you want to skip?
    # If so, set header=0 (and your numeric data starts in row 1).
    # If your numeric data is literally from the first row, use header=None.
    # Adjust as needed:
    header_option = 0  # or None, depending on your file structure
    
    # -------------------------------------------------------------------
    # 2) READ THE EXCEL SHEET INTO A DATAFRAME
    # -------------------------------------------------------------------
    # We do not dropna here; we read everything, including NaNs, 
    # because shapes might not all have the same row count.
    df = pd.read_excel(input_file, sheet_name=sheet_name, header=header_option)
    
    # If you definitely do NOT have any header row and want to treat 
    # the first row as data, use header=None:
    # df = pd.read_excel(input_file, sheet_name=sheet_name, header=None)
    
    # -------------------------------------------------------------------
    # 3) IDENTIFY SHAPES (COLUMN PAIRS)
    # -------------------------------------------------------------------
    all_columns = df.columns
    num_cols = len(all_columns)
    
    # We assume each shape has exactly 2 columns: R and X
    num_shapes = num_cols // 2
    
    # -------------------------------------------------------------------
    # 4) PROCESS EACH SHAPE
    # -------------------------------------------------------------------
    for shape_index in range(num_shapes):
        # Columns for this shape
        r_col = all_columns[2 * shape_index]
        x_col = all_columns[2 * shape_index + 1]
        
        # Gather all (R, X) pairs from these two columns, ignoring rows where both are NaN
        shape_points = []
        for row_i in range(len(df)):
            r_val = df.at[row_i, r_col]
            x_val = df.at[row_i, x_col]
            
            # If both are NaN or None, skip
            if pd.isna(r_val) and pd.isna(x_val):
                continue
            
            # If either is numeric, collect them (coercing them to float if possible)
            try:
                r_float = float(r_val)
                x_float = float(x_val)
                shape_points.append((r_float, x_float))
            except:
                # If there's a row that can't be parsed as float, skip or handle differently
                pass
        
        # Sort the shape points in clockwise order, with the first repeated
        shape_points_clockwise = sort_points_clockwise(shape_points)
        
        # Now we must write them back into the same columns/rows
        # so that the format remains consistent.
        # We'll fill from the top row downward with the new points.
        # If the new shape has more points than the original, the extra will be lost
        # If the new shape has fewer, we'll fill the leftover rows with NaN.
        
        # The total number of rows we can fill is the same as the existing DataFrame length.
        max_rows = len(df)
        
        # Keep track of how many points we actually have
        for row_i in range(max_rows):
            if row_i < len(shape_points_clockwise):
                # Write the reordered data
                df.at[row_i, r_col] = shape_points_clockwise[row_i][0]
                df.at[row_i, x_col] = shape_points_clockwise[row_i][1]
            else:
                # If no more points, set to NaN
                df.at[row_i, r_col] = np.nan
                df.at[row_i, x_col] = np.nan
    
    # -------------------------------------------------------------------
    # 5) SAVE THE UPDATED DATAFRAME TO A NEW EXCEL FILE
    # -------------------------------------------------------------------
    df.to_excel(output_file, index=False)
    print(f"Clockwise-converted data saved to {output_file}")

if __name__ == '__main__':
    main()
