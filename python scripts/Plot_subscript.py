import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
from matplotlib.colors import LinearSegmentedColormap, Normalize
from PIL import Image

# UTILITY FUNCTIONS

def get_column_name(df, possible_names):
    """
    Find the actual column name from a list of possible column names.
    Helps handle different naming conventions in input files.
    
    Args:
        df: DataFrame to search in
        possible_names: List of possible column names to look for
        
    Returns:
        Actual column name if found, otherwise raises ValueError
    """
    for name in possible_names:
        if name in df.columns:
            return name
    raise ValueError(f"Could not find any column with names: {possible_names}")

def load_loci_inputs(file_path, sheet_name='Harmonic Limits'):
    """Loads harmonic limits from an Excel file."""
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, engine='openpyxl')
        print(f"Successfully loaded sheet '{sheet_name}' with columns: {df.columns.tolist()}")
        return df
    except Exception as e:
        print(f"Error loading loci inputs: {e}")
        print(f"Available sheets in file: {pd.ExcelFile(file_path, engine='openpyxl').sheet_names}")
        return pd.DataFrame()

def determine_dynamic_titles(loci_inputs_file, excel_file):
    """
    Determine the main title and the dynamic label for the color bar.
    """
    try:
        df = pd.read_excel(loci_inputs_file, sheet_name='Harmonic Limits', engine='openpyxl', header=None)

        # Determine main title and colorbar label based on filename
        excel_file_lower = excel_file.lower()
        
        if "vhinc" in excel_file_lower:
            main_title = "Vhinc"
            colorbar_label = "Incremental Distortion"
        elif "vh inc" in excel_file_lower:
            main_title = "Vh inc"
            colorbar_label = "Incremental Distortion"
        elif "vhtotal" in excel_file_lower or "vh total" in excel_file_lower:
            main_title = "VhTotal"
            colorbar_label = "Total Harmonic Distortion"
        elif "g5" in excel_file_lower or "g55" in excel_file_lower:
            # G5/5 files - different title and colorbar label
            main_title = "G5/5"
            colorbar_label = "G5/5 Planning"
        else:
            main_title = "VhTotal"
            colorbar_label = "Total Harmonic Distortion"
        
        return main_title, colorbar_label
    except Exception as e:
        print(f"Error determining titles: {e}")
        # Default values if there's an error
        return "VhTotal", "Total Harmonic Distortion"

def create_continuous_colormap():
    """
    Create a continuous colormap for visualizing HD/Limit ratio.
    Green (0-1): Compliant
    Yellow to Red (1-5): Non-compliant with increasing severity
    
    Returns:
        Tuple of (colormap, norm) to be used in plotting
    """
    colors = [
        (0.0, (0/255, 100/255, 0/255)),      # dark green
        (0.1, (50/255, 150/255, 50/255)),    # medium green
        (0.15, (100/255, 200/255, 100/255)), # light green
        (0.19, (150/255, 255/255, 150/255)), # very light green
        (0.2, (255/255, 180/255, 0/255)),    # orange
        (0.3, (255/255, 150/255, 0/255)),    # darker orange
        (0.4, (255/255, 120/255, 0/255)),    # orange-red
        (0.6, (255/255, 80/255, 0/255)),     # red-orange
        (0.8, (255/255, 0/255, 0/255)),      # pure red
        (1.0, (200/255, 0/255, 0/255))       # dark red
    ]
    
    cmap = LinearSegmentedColormap.from_list('continuous_cmap', colors)
    norm = Normalize(vmin=0, vmax=5)
    return cmap, norm

def plot_terr(ax, RR, XX, HD, cmap, norm, marker_size=8):
    scatter = ax.scatter(RR, XX, c=HD, cmap=cmap, norm=norm, s=marker_size, edgecolor='none', alpha=0.85)
    return scatter

# MAIN PLOTTING FUNCTION

def plotsave(
    excel_file, loci_inputs_file, loci_file, color_thresholds, output_folder,
    background_harmonics_file=None,
    background_sheet_name="Background Harmonic",
    limits_sheetname='Harmonic Limits', Loci_unit='Ω', limit_label="Total Harmonic Distortion Limit"
):
    """
    Generate comprehensive harmonic plots from calculation results.
    
    Args:
        excel_file: Path to Excel file with harmonic calculation results
        loci_inputs_file: Path to Excel file with harmonic limits
        loci_file: Path to impedance loci file (can be same as loci_inputs_file)
        color_thresholds: List of threshold values for color scale
        output_folder: Path to folder where plots will be saved
        background_harmonics_file: Path to file with background harmonics (optional)
        background_sheet_name: Sheet name for background harmonics
        limits_sheetname: Sheet name containing harmonic limits (default: 'Harmonic Limits')
        Loci_unit: Unit for impedance values (Ω by default)
        limit_label: Label for distortion limits
    """
    try:
        # Print diagnostic information to help with debugging
        print(f"Plot_subscript.py: Starting plot generation")
        print(f"Excel file: {excel_file}")
        print(f"Loci inputs file: {loci_inputs_file}")
        print(f"Output folder: {output_folder}")
        print(f"Looking for harmonic limits in sheet: {limits_sheetname}")
        
        # Create output folder if it doesn't exist
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
            print(f"Created output folder: {output_folder}")
            
        # Load harmonic limits from Excel
        print(f"Loading harmonic limits from {limits_sheetname} sheet...")
        loci_inputs = load_loci_inputs(loci_inputs_file, limits_sheetname)
        print(f"Successfully loaded harmonic limits")
        
        # Setup and initialization
        
        # Create colormap for HD/Limit ratio visualization
        cmap, norm = create_continuous_colormap()
        
        # Determine titles based on data type (incremental vs. total)
        main_title, colorbar_label = determine_dynamic_titles(loci_inputs_file, excel_file)
        
        # Final colorbar label combines the type and the limit description
        final_colorbar_label = f"HD/Limit ratio | Limit: {colorbar_label} Limit (%V1) at PCC"
        
        # Load all harmonic order sheets from the Excel file
        xl = pd.ExcelFile(excel_file, engine='openpyxl')
        sheet_names = [sheet for sheet in xl.sheet_names if sheet.startswith("Harmonic Order")]
        
        # Define page layout parameters
        max_subplots = 15  # Maximum subplots per page (5×3 grid)
        num_figures = (len(sheet_names) + max_subplots - 1) // max_subplots

        # List to store information about non-compliant harmonic orders
        non_compliant_info = []

        # Set colorbar label based on the type of analysis
        if main_title == "Vh inc" or main_title == "Vhinc":
            final_colorbar_label = "HD/Limit ratio  |  Limit: Incremental Distortion Limit (%V1) at PCC"
        elif main_title == "G5/5":
            final_colorbar_label = "HD/Limit ratio  |  Limit: G5/5 Planning Limit (%V1) at PCC"
        else:
            final_colorbar_label = "HD/Limit ratio  |  Limit: Total Harmonic Distortion Limit (%V1) at PCC"
        
        # Set title color based on the type of analysis
        title_color = 'black'
        
        # Generate main summary pages with all harmonic order
        print('Creating plots for Harmonic Orders:')
        for fig_idx in range(num_figures):
            # Create figure with 5×3 grid of subplots - original compact size
            fig, axs = plt.subplots(5, 3, figsize=(10, 14), dpi=150)  # Back to original compact size
            # Add a thin blue border to the entire figure
            fig.patch.set_linewidth(1)  # Set border width
            fig.patch.set_edgecolor('#1E90FF')  # Set border color to blue
            axs = axs.flatten()  # Flatten 2D array of axes for easier indexing

            # Create a subplot for each harmonic order
            for subplot_idx in range(max_subplots):
                global_idx = fig_idx * max_subplots + subplot_idx
                
                # If we've processed all sheets, turn off remaining subplots
                if global_idx >= len(sheet_names):
                    axs[subplot_idx].axis('off')
                    continue
                    
                # Extract data for current harmonic order
                sheet_name = sheet_names[global_idx]
                df = pd.read_excel(excel_file, sheet_name=sheet_name, engine='openpyxl')
                harmonic_order = int(sheet_name.split()[-1])
                
                # Find the appropriate column names (handles different naming conventions)
                R_col = get_column_name(df, ['Initial R (Ω)', 'Initial R (ohm)', 'R (Ω)', 'R (ohm)'])
                X_col = get_column_name(df, ['Initial X (Ω)', 'Initial X (ohm)', 'X (Ω)', 'X (ohm)'])
                HD_col = get_column_name(df, ['Result HD', 'Max HD'])
                
                # Extract data values (skip header row)
                RR = df[R_col].values[1:]
                XX = df[X_col].values[1:]
                HD = df[HD_col].values[1:]
                
                # Find worst-case (maximum) harmonic distortion
                worst_case_hd = HD.max()
                worst_case_index = np.argmax(HD)
                worst_case_R = RR[worst_case_index]
                worst_case_X = XX[worst_case_index]
                
                # Get limit for this harmonic order
                limit_row = loci_inputs[loci_inputs['Harmonic Order (H)'] == harmonic_order]
                if main_title == "Vh inc" or main_title == "Vhinc":
                    limit = limit_row.iloc[0]['Incremental Distortion Limit (%V1) at PCC'] if not limit_row.empty else 1.0
                else:  # For "VhTotal", "G5/5", or other total distortion types
                    limit = limit_row.iloc[0]['Total Limit (%V1) at PCC'] if not limit_row.empty else 1.0
                
                # Ensure limit is valid
                if limit <= 0:
                    raise ValueError(f"Invalid limit ({limit}) for Harmonic Order {harmonic_order}")
                
                # Get current axis for this subplot
                ax = axs[subplot_idx]
                
                # Plot the scatter points
                scatter = plot_terr(ax, RR, XX, HD / limit, cmap, norm, marker_size=7)
                
                # Mark the worst-case point with a star
                ax.scatter(
                    worst_case_R, worst_case_X,
                    color=cmap(norm(worst_case_hd / limit)), marker='*', s=18,
                    linewidths=0.4, edgecolor='black', zorder=1, label='Worst-case HD'
                )
                
                # Before setting the title, determine if this harmonic order exceeds its limit
                title_color = 'red' if worst_case_hd / limit > 1 else 'black'
                
                # Add title with dynamic color
                if subplot_idx < len(axs):
                    ax.set_title(
                        f'Harmonic Order: {harmonic_order}', fontsize=7, weight='bold', pad=18, color=title_color
                    )
                
                # Add worst-case details above plot
                ax.text(
                    0.5, 1.1,
                    f"Worst-case HD = {worst_case_hd:.2f}% at R = {worst_case_R:.1f} {Loci_unit}, X = {worst_case_X:.1f} {Loci_unit}",
                    ha='center', va='bottom', fontsize=5, transform=ax.transAxes,
                    color=title_color
                )
                
                # Add axis labels
                ax.set_xlabel(f'R [{Loci_unit}]', fontsize=6, labelpad=5)
                ax.set_ylabel(f'X [{Loci_unit}]', fontsize=6, labelpad=5)
                
                # Add HD Limit annotation - positioned at top right inside plot area
                ax.annotate(
                    f'HD Limit = {limit:.2f}%',
                    xy=(0.98, 0.98),
                    xycoords='axes fraction',
                    fontsize=5,
                    ha='right',
                    va='top',
                    bbox=dict(boxstyle='round,pad=0.2', fc='white', ec='gray', alpha=0.8),
                    rotation=0
                )
                
                # Configure axis appearance
                ax.tick_params(axis='both', which='major', labelsize=6)
                ax.grid(visible=True, which='major', color='gray', linestyle='-', linewidth=0.5, alpha=0.5)
                ax.minorticks_on()
                
                # Check if this harmonic order is non-compliant (exceeds limit)
                if worst_case_hd / limit > 1:
                    # For non-compliant orders, get network impedance values (post-integration)
                    try:
                        network_R = df['Network R (ohm)'].values[1:][worst_case_index]
                        network_X = df['Network X (ohm)'].values[1:][worst_case_index]
                    except (KeyError, IndexError):
                        # Fallback if columns don't exist or index is out of range
                        network_R = worst_case_R
                        network_X = worst_case_X
                    
                    # Store information for non-compliant summary and individual sheets
                    non_compliant_info.append({
                        'harmonic_order': harmonic_order,
                        'RR': RR,
                        'XX': XX,
                        'HD': HD,
                        'limit': limit,
                        'worst_case_hd': worst_case_hd,
                        'worst_case_R': worst_case_R,
                        'worst_case_X': worst_case_X,
                        'network_R': network_R,
                        'network_X': network_X
                    })
            
            # Add page title showing harmonic orders on this page
            harmonic_orders = [
                int(sheet.split()[-1]) for sheet in sheet_names[fig_idx * max_subplots:(fig_idx + 1) * max_subplots]
            ]
            fig.suptitle(
                r'$\bf{' + main_title + '}$' + f'\nHarmonic Orders: {harmonic_orders}',
                fontsize=10
            )
            
            # Adjust layout - optimized for compact size with proper spacing and colorbar room
            fig.subplots_adjust(hspace=0.65, wspace=0.25, left=0.08, right=0.92, top=0.93, bottom=0.12)
            
            # Add colorbar at the bottom with proper positioning
            cbar_ax = fig.add_axes([0.15, 0.05, 0.7, 0.025])
            cbar = fig.colorbar(
                plt.cm.ScalarMappable(norm=norm, cmap=cmap),
                cax=cbar_ax, spacing='uniform', orientation='horizontal', ticks=[0, 1, 2, 3, 4, 5]
            )
            cbar.set_label(final_colorbar_label, fontsize=9)
            cbar.ax.tick_params(labelsize=8)
            
            # Save the figure with optimized DPI for file size
            output_file = os.path.join(output_folder, f'{main_title}_Page_{fig_idx + 1}.png')
            fig.savefig(output_file, format='png', dpi=150, bbox_inches='tight')
            plt.close(fig)
        
        # Generate summary sheet for all non-compliant harmonic orders
        
        if non_compliant_info:
            # Determine how many pages we need
            items_per_page = 15
            num_pages = (len(non_compliant_info) + items_per_page - 1) // items_per_page  # Ceiling division
            
            for page in range(num_pages):
                # Create a figure for this page of non-compliant harmonic orders - SAME AS REGULAR SHEETS
                fig_nc, axs_nc = plt.subplots(5, 3, figsize=(10, 14), dpi=150)
                axs_nc = axs_nc.flatten()
                
                # Calculate how many plots we'll have on this page
                start_idx = page * items_per_page
                end_idx = min((page + 1) * items_per_page, len(non_compliant_info))
                num_plots_on_page = end_idx - start_idx
                
                # Process items for this page (start_idx and end_idx already calculated above)
                
                # Create a subplot for each non-compliant harmonic order on this page
                for page_idx, overall_idx in enumerate(range(start_idx, end_idx)):
                    ax = axs_nc[page_idx]
                    info = non_compliant_info[overall_idx]
                    
                    # Plot data and mark worst-case point
                    scatter_nc = plot_terr(ax, info['RR'], info['XX'], info['HD'] / info['limit'], cmap, norm, marker_size=10)
                    ax.scatter(
                        info['worst_case_R'], info['worst_case_X'],
                        color=cmap(norm(info['worst_case_hd'] / info['limit'])), marker='*', s=22,
                        linewidths=0.4, edgecolor='black', zorder=1, label='Worst-case HD'
                    )
                    
                    # Add title in red to highlight non-compliance
                    ax.set_title(
                        f'Harmonic Order: {info["harmonic_order"]}', fontsize=8, weight='bold', pad=19, color='red'
                    )
                    
                    # Add worst-case details
                    ax.text(
                        0.5, 1.1,
                        f"Worst-case HD = {info['worst_case_hd']:.2f}% at R = {info['worst_case_R']:.1f} {Loci_unit}, X = {info['worst_case_X']:.1f} {Loci_unit}",
                        ha='center', va='bottom', fontsize=5, transform=ax.transAxes,
                        color=title_color
                    )
                    
                    # Add axis labels
                    ax.set_xlabel(f'R [{Loci_unit}]', fontsize=6, labelpad=5)
                    ax.set_ylabel(f'X [{Loci_unit}]', fontsize=6, labelpad=5)
                    
                    # Add HD Limit annotation - positioned at top right inside plot area
                    ax.annotate(
                        f'HD Limit = {info["limit"]:.2f}%',
                        xy=(0.98, 0.98),
                        xycoords='axes fraction',
                        fontsize=5,
                        ha='right',
                        va='top',
                        bbox=dict(boxstyle='round,pad=0.2', fc='white', ec='gray', alpha=0.8),
                        rotation=0
                    )
                    
                    # Configure axis appearance
                    ax.tick_params(axis='both', which='major', labelsize=7)
                    ax.grid(visible=True, which='major', color='gray', linestyle='-', linewidth=0.5, alpha=0.5)
                    ax.minorticks_on()
                
                # Remove unused subplots - EXACTLY like regular sheets
                for idx in range(num_plots_on_page, len(axs_nc)):
                    fig_nc.delaxes(axs_nc[idx])
                
                # Add title showing non-compliant harmonic orders for this page - SAME FORMAT AS REGULAR SHEETS
                nc_harmonic_orders = sorted(info['harmonic_order'] for info in non_compliant_info[start_idx:end_idx])
                fig_nc.suptitle(
                    r'$\bf{' + main_title + '}$' + f'\nNon-Compliant Harmonic Orders: {nc_harmonic_orders}',
                    fontsize=10  # Same as regular sheets
                )
                
                # Adjust layout - EXACTLY SAME AS REGULAR SHEETS
                fig_nc.subplots_adjust(hspace=0.65, wspace=0.25, left=0.08, right=0.92, top=0.93, bottom=0.12)
                
                # Add colorbar - EXACTLY SAME POSITIONING AS REGULAR SHEETS
                cbar_ax_nc = fig_nc.add_axes([0.15, 0.05, 0.7, 0.025])
                cbar_nc = fig_nc.colorbar(
                    plt.cm.ScalarMappable(norm=norm, cmap=cmap),
                    cax=cbar_ax_nc, spacing='uniform', orientation='horizontal', ticks=[0, 1, 2, 3, 4, 5]
                )
                cbar_nc.set_label(final_colorbar_label, fontsize=9)
                cbar_nc.ax.tick_params(labelsize=8)
                
                # Save the figure with optimized DPI
                page_suffix = f"_Page_{page+1}" if num_pages > 1 else ""
                nc_output_file = os.path.join(output_folder, f'Non_Compliant_Harmonic_Summation_A4_Optimized{page_suffix}.png')
                fig_nc.savefig(nc_output_file, format='png', dpi=150, bbox_inches='tight')
                plt.close(fig_nc)
        
        # Generate individual full-size sheets for each non-compliant harmonic order
        
        for info in non_compliant_info:
            print(f"Creating detailed sheet for Harmonic Order {info['harmonic_order']}")
            
            # Create a figure with a single subplot that fills most of the page
            fig_ind = plt.figure(figsize=(10, 14), dpi=150)  # Consistent compact size with other plots
            
            # Create a single subplot that takes up most of the figure area
            ax_ind = fig_ind.add_subplot(111)
            
            # Plot the data points
            scatter_ind = plot_terr(ax_ind, info['RR'], info['XX'], info['HD'] / info['limit'], cmap, norm, marker_size=7)
            
            # Mark the worst-case point with a star
            ax_ind.scatter(
                info['worst_case_R'], info['worst_case_X'],
                color=cmap(norm(info['worst_case_hd'] / info['limit'])), marker='*', s=22,
                linewidths=0.4, edgecolor='black', zorder=1
            )
            
            # Set axis labels and grid
            ax_ind.set_xlabel(f'R [{Loci_unit}]', fontsize=7, labelpad=5)
            ax_ind.set_ylabel(f'X [{Loci_unit}]', fontsize=7, labelpad=5)
            ax_ind.tick_params(axis='both', which='major', labelsize=7)
            ax_ind.grid(visible=True, which='major', color='gray', linestyle='-', linewidth=0.5, alpha=0.5)
            ax_ind.minorticks_on()
            
            # Main title (Vh inc)
            fig_ind.text(0.5, 0.97, 
                         main_title, 
                         ha='center', va='top', 
                         fontsize=14, fontweight='bold', color='black')
            
            # Non-Compliant Order Title in Red (reduced spacing)
            fig_ind.text(0.5, 0.94, 
                         f"Non-Compliant Harmonic Order: [{info['harmonic_order']}]", 
                         ha='center', va='top', 
                         fontsize=12, fontweight='bold', color='red')
            
            # Worst-case details with network impedance (reduced spacing)
            fig_ind.text(0.5, 0.91, 
                         f"Worst-case HD = {info['worst_case_hd']:.2f}% at:\n"
                         f"Before Site Integration - Z = {info['worst_case_R']:.1f} {'+' if info['worst_case_X'] >= 0 else '-'} j{abs(info['worst_case_X']):.1f} {Loci_unit}\n"
                         f"After Site Integration - Z = {info['network_R']:.1f} {'+' if info['network_X'] >= 0 else '-'} j{abs(info['network_X']):.1f} {Loci_unit}", 
                         ha='center', va='top', 
                         fontsize=10, color='black')
            
            # Place HD Limit text at top right inside plot area
            ax_ind.text(
                0.98, 0.98,  # Top right corner inside plot
                f"HD Limit = {info['limit']:.2f}%",
                transform=ax_ind.transAxes,  # Use axes coordinates
                ha='right', va='top',  # Right-aligned, top-aligned
                fontsize=9, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.3', fc='white', ec='gray', alpha=0.8),
                rotation=0
            )
            
            # Adjust layout and add horizontal color bar (moved up to avoid overlap)
            fig_ind.tight_layout(rect=[0.05, 0.12, 0.95, 0.88])  # Adjust the rectangle to leave space for titles and colorbar
            
            cbar_ax_ind = fig_ind.add_axes([0.15, 0.06, 0.7, 0.02])
            sm_ind = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
            sm_ind.set_array([])
            cbar_ind = fig_ind.colorbar(sm_ind, cax=cbar_ax_ind, orientation='horizontal', ticks=[0, 1, 2, 3, 4, 5])
            cbar_ind.set_label(final_colorbar_label, fontsize=9)
            cbar_ind.ax.tick_params(labelsize=8)
            
            # Save individual detailed sheet with optimized DPI
            individual_output_file = os.path.join(
                output_folder,
                f'Non_Compliant_Harmonic_Order_{info["harmonic_order"]}_Detailed.png'
            )
            fig_ind.savefig(individual_output_file, format='png', dpi=150, bbox_inches='tight')
            plt.close(fig_ind)
        
        print('\nAll plots generated successfully!')
    except Exception as e:
        print(f"Error in plotsave function: {e}")

if __name__ == "__main__":
    # For standalone testing
    excel_file = '02-C-Vhtotal-Import HLF.xlsx'
    loci_inputs_file = 'Loci_Script_Inputs.xlsm'
    loci_file = 'Loci_Script_Inputs.xlsm'
    background_harmonics_file = None
    output_folder = 'Output_Plots'
    color_thresholds = [0.5, 1, 3, 5, 10, 15]

    # Create output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # Generate all plots
    plotsave(
        excel_file, 
        loci_inputs_file, 
        loci_file, 
        color_thresholds, 
        output_folder, 
        background_harmonics_file=background_harmonics_file,
        limits_sheetname='Harmonic Limits'
    )
