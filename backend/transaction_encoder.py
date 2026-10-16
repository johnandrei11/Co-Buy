"""
Self-contained TransactionEncoder implementation.
Provides 100% API compatibility with mlxtend.preprocessing.TransactionEncoder
without requiring scikit-learn or scipy, preventing Windows Smart App Control (SAC)
and WDAC policy blocks on unsigned C/Pythran extension DLLs.
"""

import numpy as np


class TransactionEncoder:
    """Encoder class for transaction data in Python lists.

    Converts a list of transactions (e.g. [['Milk', 'Bread'], ['Bread', 'Butter']])
    into a boolean NumPy array suitable for frequent pattern mining (Apriori, FP-Growth).
    """

    def __init__(self):
        self.columns_ = []
        self.columns_mapping_ = {}

    def fit(self, X):
        """Learn unique column names from transaction list."""
        unique_items = set()
        for transaction in X:
            for item in transaction:
                unique_items.add(item)
        self.columns_ = sorted(unique_items)
        self.columns_mapping_ = {item: idx for idx, item in enumerate(self.columns_)}
        return self

    def transform(self, X, sparse=False):
        """Transform transactions into a one-hot encoded boolean NumPy array."""
        array = np.zeros((len(X), len(self.columns_)), dtype=bool)
        mapping = self.columns_mapping_
        for row_idx, transaction in enumerate(X):
            for item in transaction:
                col_idx = mapping.get(item)
                if col_idx is not None:
                    array[row_idx, col_idx] = True
        return array

    def fit_transform(self, X, sparse=False):
        """Fit to data, then transform it."""
        return self.fit(X).transform(X, sparse=sparse)

    def inverse_transform(self, array):
        """Transforms an encoded boolean NumPy array back into list of transactions."""
        cols = self.columns_
        return [[cols[idx] for idx, val in enumerate(row) if val] for row in array]
