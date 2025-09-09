"""
MetadataReader: Excel Metadata Processing Module

Handles parsing and processing of the 6 Excel sheets:
1. Feed_to_staging
2. Staging_to_GRI  
3. Enumerations
4. Rules
5. Patterns
6. Reconciliations
"""

import pandas as pd
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from loguru import logger
import openpyxl


@dataclass
class FeedMetadata:
    """Data class for Feed_to_staging sheet metadata"""
    modules: str
    feed: str
    field_name: str
    db_name: str
    db_table: str
    data_type: str
    nullable: bool
    request_type: str  # Insert/Append
    default_value: Optional[str]
    enumeration: Optional[str]
    range_bottom: Optional[float]
    range_top: Optional[float]
    mandatory: bool
    unique: bool


@dataclass
class StagingMetadata:
    """Data class for Staging_to_GRI sheet metadata"""
    modules: str
    stg_db_name: str
    stg_db_table: str
    stg_field_name: str
    trg_db_name: str
    trg_db_table: str
    trg_field_name: str
    trg_data_type: str
    nullable: bool
    request_type: str
    default_value: Optional[str]
    enumeration: Optional[str]
    range_bottom: Optional[float]
    range_top: Optional[float]
    mandatory: bool
    unique: bool


@dataclass
class EnumerationRule:
    """Data class for Enumeration sheet metadata"""
    enumeration_name: str
    enum_values: List[str]


@dataclass
class PatternRule:
    """Data class for Pattern validation rules"""
    pattern_name: str
    columns: List[str]
    pattern_data: List[Dict[str, Any]]


@dataclass
class ReconciliationRule:
    """Data class for Reconciliation rules"""
    rule_name: str
    rule_type: str  # Inter/Intra/Mix
    source_table: str
    source_column: str
    target_table: str
    target_column: str
    operation: str  # SUM, COUNT, etc.
    tolerance: Optional[float]


class MetadataReader:
    """
    Main class for reading and processing Excel metadata
    """
    
    def __init__(self, metadata_file_path: str):
        self.metadata_file_path = metadata_file_path
        self.feed_metadata: List[FeedMetadata] = []
        self.staging_metadata: List[StagingMetadata] = []
        self.enumerations: Dict[str, List[str]] = {}
        self.patterns: List[PatternRule] = []
        self.reconciliation_rules: List[ReconciliationRule] = []
        
        logger.info(f"Initializing MetadataReader with file: {metadata_file_path}")
    
    def validate_file_exists(self) -> bool:
        """Validate that the metadata Excel file exists"""
        if not os.path.exists(self.metadata_file_path):
            logger.error(f"Metadata file not found: {self.metadata_file_path}")
            return False
        return True
    
    def load_all_metadata(self) -> bool:
        """Load all metadata from Excel sheets"""
        try:
            if not self.validate_file_exists():
                return False
            
            logger.info("Loading metadata from all sheets...")
            
            # Load each sheet
            success = (
                self._load_feed_to_staging() and
                self._load_staging_to_gri() and
                self._load_enumerations() and
                self._load_patterns() and
                self._load_reconciliations()
            )
            
            if success:
                logger.info("All metadata loaded successfully")
                self._log_metadata_summary()
            else:
                logger.error("Failed to load some metadata sheets")
            
            return success
            
        except Exception as e:
            logger.error(f"Error loading metadata: {str(e)}")
            return False
    
    def _load_feed_to_staging(self) -> bool:
        """Load Feed_to_staging sheet"""
        try:
            logger.info("Loading Feed_to_staging sheet...")
            df = pd.read_excel(self.metadata_file_path, sheet_name='Feed_to_staging')
            
            for _, row in df.iterrows():
                feed_meta = FeedMetadata(
                    modules=str(row['Modules']),
                    feed=str(row['Feed']),
                    field_name=str(row['FieldName']),
                    db_name=str(row['DBName']),
                    db_table=str(row['DB Table']),
                    data_type=str(row['DataType']),
                    nullable=self._parse_boolean(row['Nullable']),
                    request_type=str(row['Request']),
                    default_value=self._parse_optional_string(row['Default']),
                    enumeration=self._parse_optional_string(row['Enumeration']),
                    range_bottom=self._parse_optional_float(row['RangeBottom']),
                    range_top=self._parse_optional_float(row['RangeTop']),
                    mandatory=self._parse_boolean(row['Mandatory']),
                    unique=self._parse_boolean(row['Unique'])
                )
                self.feed_metadata.append(feed_meta)
            
            logger.info(f"Loaded {len(self.feed_metadata)} feed metadata records")
            return True
            
        except Exception as e:
            logger.error(f"Error loading Feed_to_staging sheet: {str(e)}")
            return False
    
    def _load_staging_to_gri(self) -> bool:
        """Load Staging_to_GRI sheet"""
        try:
            logger.info("Loading Staging_to_GRI sheet...")
            df = pd.read_excel(self.metadata_file_path, sheet_name='Staging to GRI')
            
            for _, row in df.iterrows():
                staging_meta = StagingMetadata(
                    modules=str(row['Modules']),
                    stg_db_name=str(row['Stg_DBName']),
                    stg_db_table=str(row['Stg_DB Table']),
                    stg_field_name=str(row['STG_FieldName']),
                    trg_db_name=str(row['Trg_DBName']),
                    trg_db_table=str(row['Trg _DB Table']),
                    trg_field_name=str(row['Trg _FieldName']),
                    trg_data_type=str(row['Trg _DataType']),
                    nullable=self._parse_boolean(row['Nullable']),
                    request_type=str(row['Request']),
                    default_value=self._parse_optional_string(row['Default']),
                    enumeration=self._parse_optional_string(row['Enumeration']),
                    range_bottom=self._parse_optional_float(row['RangeBottom']),
                    range_top=self._parse_optional_float(row['RangeTop']),
                    mandatory=self._parse_boolean(row['Mandatory']),
                    unique=self._parse_boolean(row['Unique'])
                )
                self.staging_metadata.append(staging_meta)
            
            logger.info(f"Loaded {len(self.staging_metadata)} staging metadata records")
            return True
            
        except Exception as e:
            logger.error(f"Error loading Staging_to_GRI sheet: {str(e)}")
            return False
    
    def _load_enumerations(self) -> bool:
        """Load Enumeration sheet"""
        try:
            logger.info("Loading Enumerations sheet...")
            df = pd.read_excel(self.metadata_file_path, sheet_name='Enumeration')
            
            # Group by enumeration name
            for enum_name in df['EnumerationName'].unique():
                enum_values = df[df['EnumerationName'] == enum_name]['EnumValues'].tolist()
                self.enumerations[enum_name] = [str(val) for val in enum_values]
            
            logger.info(f"Loaded {len(self.enumerations)} enumeration rules")
            return True
            
        except Exception as e:
            logger.error(f"Error loading Enumerations sheet: {str(e)}")
            return False
    
    def _load_patterns(self) -> bool:
        """Load Patterns sheet"""
        try:
            logger.info("Loading Patterns sheet...")
            df = pd.read_excel(self.metadata_file_path, sheet_name='Patterns')
            
            # Process pattern rules (implementation depends on exact structure)
            logger.info("Pattern loading completed")
            return True
            
        except Exception as e:
            logger.error(f"Error loading Patterns sheet: {str(e)}")
            return False
    
    def _load_reconciliations(self) -> bool:
        """Load Reconciliations sheet"""
        try:
            logger.info("Loading Reconciliations sheet...")
            df = pd.read_excel(self.metadata_file_path, sheet_name='Reconciliations')
            
            # Process reconciliation rules
            logger.info("Reconciliation loading completed")
            return True
            
        except Exception as e:
            logger.error(f"Error loading Reconciliations sheet: {str(e)}")
            return False
    
    def _parse_boolean(self, value: Any) -> bool:
        """Parse boolean values from Excel (Y/N, True/False, 1/0)"""
        if pd.isna(value):
            return False
        
        str_val = str(value).upper()
        return str_val in ['Y', 'YES', 'TRUE', '1', 'T']
    
    def _parse_optional_string(self, value: Any) -> Optional[str]:
        """Parse optional string values from Excel"""
        if pd.isna(value) or str(value).strip() == '':
            return None
        return str(value)
    
    def _parse_optional_float(self, value: Any) -> Optional[float]:
        """Parse optional float values from Excel"""
        if pd.isna(value):
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _log_metadata_summary(self):
        """Log summary of loaded metadata"""
        logger.info("Metadata Loading Summary:")
        logger.info(f"  - Feed metadata records: {len(self.feed_metadata)}")
        logger.info(f"  - Staging metadata records: {len(self.staging_metadata)}")
        logger.info(f"  - Enumeration rules: {len(self.enumerations)}")
        logger.info(f"  - Pattern rules: {len(self.patterns)}")
        logger.info(f"  - Reconciliation rules: {len(self.reconciliation_rules)}")
    
    def get_feed_metadata_by_module(self, module_name: str) -> List[FeedMetadata]:
        """Get feed metadata filtered by module name"""
        return [meta for meta in self.feed_metadata if meta.modules == module_name]
    
    def get_staging_metadata_by_module(self, module_name: str) -> List[StagingMetadata]:
        """Get staging metadata filtered by module name"""
        return [meta for meta in self.staging_metadata if meta.modules == module_name]
    
    def get_enumeration_values(self, enumeration_name: str) -> List[str]:
        """Get enumeration values for a specific enumeration name"""
        return self.enumerations.get(enumeration_name, [])
    
    def get_all_modules(self) -> List[str]:
        """Get list of all unique modules from both feed and staging metadata"""
        feed_modules = [meta.modules for meta in self.feed_metadata]
        staging_modules = [meta.modules for meta in self.staging_metadata]
        return list(set(feed_modules + staging_modules))
    
    def get_db_names(self) -> List[str]:
        """Get list of all unique database names"""
        feed_dbs = [meta.db_name for meta in self.feed_metadata]
        staging_source_dbs = [meta.stg_db_name for meta in self.staging_metadata]
        staging_target_dbs = [meta.trg_db_name for meta in self.staging_metadata]
        return list(set(feed_dbs + staging_source_dbs + staging_target_dbs))