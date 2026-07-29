'use client';

import { useMemo, useState, type FC } from 'react';
import {
  useActivateLawyer,
  useCreateLawyer,
  useDeactivateLawyer,
  useLawyers,
  useUpdateLawyer,
} from '@/api/hooks/useRightsLawyer';
import type {
  RightsLawyer,
  RightsLawyerType,
  UpdateLawyerRequest,
} from '@/types/api-schema/rights-lawyer';
import { LAWYER_TYPE_LABELS } from '../lawyerLabels';
import styles from './LawyersDirectory.module.scss';

const LAWYER_TYPES: RightsLawyerType[] = ['IN_HOUSE', 'EXTERNAL_COUNSEL', 'LAW_FIRM', 'OTHER'];

const splitCodes = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

/**
 * Lawyers directory. Admin-only in the UI — the API also rejects writes from anyone else.
 * There is no delete: a lawyer is deactivated and their past opinions keep their force.
 */
export const LawyersDirectory: FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RightsLawyerType | ''>('');
  const [showInactive, setShowInactive] = useState(true);

  const [editing, setEditing] = useState<RightsLawyer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [lawyerType, setLawyerType] = useState<RightsLawyerType>('EXTERNAL_COUNSEL');
  const [organization, setOrganization] = useState('');
  const [barId, setBarId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jurisdictions, setJurisdictions] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

  const lawyersQuery = useLawyers({
    limit: 100,
    ...(search ? { q: search } : {}),
    ...(typeFilter ? { lawyerType: typeFilter } : {}),
    ...(showInactive ? {} : { isActive: true }),
  });

  const createMutation = useCreateLawyer();
  const updateMutation = useUpdateLawyer();
  const deactivateMutation = useDeactivateLawyer();
  const activateMutation = useActivateLawyer();

  const lawyers = useMemo(() => lawyersQuery.data?.items ?? [], [lawyersQuery.data]);

  const openCreate = () => {
    setEditing(null);
    setFullName('');
    setLawyerType('EXTERNAL_COUNSEL');
    setOrganization('');
    setBarId('');
    setEmail('');
    setPhone('');
    setJurisdictions('');
    setSpecialization('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (lawyer: RightsLawyer) => {
    setEditing(lawyer);
    setFullName(lawyer.fullName);
    setLawyerType(lawyer.lawyerType);
    setOrganization(lawyer.organization ?? '');
    setBarId(lawyer.barId ?? '');
    setEmail(lawyer.email ?? '');
    setPhone(lawyer.phone ?? '');
    setJurisdictions(lawyer.jurisdictionCodes.join(', '));
    setSpecialization(lawyer.specializationRu ?? '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (fullName.trim().length < 2) {
      setFormError('Имя юриста должно содержать минимум 2 символа.');
      return;
    }
    const payload: UpdateLawyerRequest = {
      fullName: fullName.trim(),
      lawyerType,
      organization: organization.trim() || undefined,
      barId: barId.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      jurisdictionCodes: splitCodes(jurisdictions),
      specializationRu: specialization.trim() || undefined,
    };

    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createMutation.mutateAsync({ ...payload, fullName: fullName.trim() });
      }
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось сохранить юриста.');
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingId || deactivateReason.trim().length < 10) {
      setFormError('Причина деактивации должна содержать минимум 10 символов.');
      return;
    }
    setFormError(null);
    try {
      await deactivateMutation.mutateAsync({
        id: deactivatingId,
        data: { reasonRu: deactivateReason.trim() },
      });
      setDeactivatingId(null);
      setDeactivateReason('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось деактивировать юриста.');
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Справочник юристов</h2>
      <p className={styles.sectionHint}>
        Имя юриста из справочника попадает в снимок решения: последующее переименование записи не
        переписывает историю. Физического удаления нет — только деактивация.
      </p>

      <div className={styles.filters}>
        <div className={styles.filterField}>
          <label className={styles.fieldLabel} htmlFor="lawyers-search">
            Поиск
          </label>
          <input
            id="lawyers-search"
            className={styles.textInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.fieldLabel} htmlFor="lawyers-type">
            Тип
          </label>
          <select
            id="lawyers-type"
            className={styles.select}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as RightsLawyerType | '')}
          >
            <option value="">Все</option>
            {LAWYER_TYPES.map((value) => (
              <option key={value} value={value}>
                {LAWYER_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <label className={styles.checkboxRow} htmlFor="lawyers-show-inactive">
          <input
            id="lawyers-show-inactive"
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Показывать деактивированных
        </label>
        <button type="button" className={styles.primaryButton} onClick={openCreate}>
          Добавить юриста
        </button>
      </div>

      {lawyersQuery.isLoading && <p className={styles.emptyState}>Загрузка…</p>}
      {lawyersQuery.isError && (
        <p className={styles.errorText}>Не удалось загрузить справочник юристов.</p>
      )}

      {!lawyersQuery.isLoading && lawyers.length === 0 && (
        <p className={styles.emptyState}>Юристы не добавлены.</p>
      )}

      {lawyers.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.tableHeadCell}>Имя</th>
              <th className={styles.tableHeadCell}>Тип</th>
              <th className={styles.tableHeadCell}>Организация</th>
              <th className={styles.tableHeadCell}>Юрисдикции</th>
              <th className={styles.tableHeadCell}>Пользователь</th>
              <th className={styles.tableHeadCell}>Статус</th>
              <th className={styles.tableHeadCell}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {lawyers.map((lawyer) => (
              <tr key={lawyer.id}>
                <td className={styles.tableCell}>{lawyer.fullName}</td>
                <td className={styles.tableCell}>{LAWYER_TYPE_LABELS[lawyer.lawyerType]}</td>
                <td className={styles.tableCell}>{lawyer.organization ?? '—'}</td>
                <td className={styles.tableCell}>{lawyer.jurisdictionCodes.join(', ') || '—'}</td>
                <td className={styles.tableCell}>
                  {lawyer.userEmail ?? '—'}
                  {lawyer.userId && !lawyer.hasLawyerRole && (
                    <span className={styles.badge} data-tone="orange">
                      нет роли lawyer
                    </span>
                  )}
                </td>
                <td className={styles.tableCell}>
                  <span className={styles.badge} data-tone={lawyer.isActive ? 'green' : 'red'}>
                    {lawyer.isActive ? 'Активен' : 'Деактивирован'}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <button
                    type="button"
                    className={styles.rowButton}
                    onClick={() => openEdit(lawyer)}
                  >
                    Изменить
                  </button>
                  {lawyer.isActive ? (
                    <button
                      type="button"
                      className={styles.rowButton}
                      onClick={() => {
                        setDeactivatingId(lawyer.id);
                        setDeactivateReason('');
                        setFormError(null);
                      }}
                    >
                      Деактивировать
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.rowButton}
                      onClick={() => void activateMutation.mutateAsync(lawyer.id)}
                    >
                      Активировать
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isFormOpen && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modal}
            role="dialog"
            aria-label={editing ? 'Изменить юриста' : 'Добавить юриста'}
          >
            <h3 className={styles.modalTitle}>{editing ? 'Изменить юриста' : 'Добавить юриста'}</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-full-name">
                Имя
              </label>
              <input
                id="lawyer-full-name"
                className={styles.textInput}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-type">
                Тип
              </label>
              <select
                id="lawyer-type"
                className={styles.select}
                value={lawyerType}
                onChange={(event) => setLawyerType(event.target.value as RightsLawyerType)}
              >
                {LAWYER_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {LAWYER_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-organization">
                Организация
              </label>
              <input
                id="lawyer-organization"
                className={styles.textInput}
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-bar-id">
                Регистрационный номер
              </label>
              <input
                id="lawyer-bar-id"
                className={styles.textInput}
                value={barId}
                onChange={(event) => setBarId(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-email">
                Email
              </label>
              <input
                id="lawyer-email"
                className={styles.textInput}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-phone">
                Телефон
              </label>
              <input
                id="lawyer-phone"
                className={styles.textInput}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-jurisdictions">
                Юрисдикции (через запятую, ISO alpha-2)
              </label>
              <input
                id="lawyer-jurisdictions"
                className={styles.textInput}
                value={jurisdictions}
                onChange={(event) => setJurisdictions(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-specialization">
                Специализация
              </label>
              <textarea
                id="lawyer-specialization"
                className={styles.textArea}
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.button} onClick={closeForm}>
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={() => void handleSave()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivatingId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-label="Деактивировать юриста">
            <h3 className={styles.modalTitle}>Деактивировать юриста</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lawyer-deactivate-reason">
                Причина (минимум 10 символов)
              </label>
              <textarea
                id="lawyer-deactivate-reason"
                className={styles.textArea}
                value={deactivateReason}
                onChange={(event) => setDeactivateReason(event.target.value)}
              />
            </div>
            {formError && <p className={styles.errorText}>{formError}</p>}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => setDeactivatingId(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={deactivateMutation.isPending}
                onClick={() => void handleDeactivate()}
              >
                Деактивировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
