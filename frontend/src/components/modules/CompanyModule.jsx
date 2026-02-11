import { useMemo, useState, useEffect } from 'react';
import { useGetCompanyInfo, useSaveCompanyInfo, useGetAllUsers } from '../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CompanyModule({ userProfile }) {
  const { data: companyInfo, isLoading } = useGetCompanyInfo();
  const saveCompanyInfo = useSaveCompanyInfo();
  const { data: users = [] } = useGetAllUsers();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    gst: '',
    taxDetails: '',
    policies: '',
  });

  const isAdmin = userProfile.role.hasOwnProperty('admin');
  const isOwner = userProfile.role.hasOwnProperty('owner') || userProfile.role.hasOwnProperty('param');

  useEffect(() => {
    if (companyInfo) {
      // Split contact info if possible or just use it
      const [email, phone] = companyInfo.contact.split('|');
      
      setFormData({
        name: companyInfo.name,
        address: companyInfo.address,
        contactEmail: email || companyInfo.contact,
        contactPhone: phone || '',
        gst: companyInfo.gst,
        taxDetails: companyInfo.taxDetails,
        policies: companyInfo.policies,
      });
    }
  }, [companyInfo]);

  const handleGstAutofill = () => {
    if (!isAdmin && !isOwner) return;
    const gstValue = formData.gst.trim();
    if (!gstValue) {
      toast.error('Enter GST number first');
      return;
    }
    const presets = {
      GSTIN123456: {
        name: 'ReGen Innovations Inc.',
        address: '123 Enterprise Drive, Suite 400, Innovation City',
        contact: 'contact@regen.com|+1 (555) 123-4567',
        gst: 'GSTIN123456',
        taxDetails: 'TX-1234567',
        policies: formData.policies,
      },
    };
    const info = presets[gstValue];
    if (!info) {
      toast.error('No company record found for this GST number');
      return;
    }
    const [email, phone] = info.contact.split('|');
    setFormData({
      name: info.name,
      address: info.address,
      contactEmail: email || info.contact,
      contactPhone: phone || '',
      gst: info.gst,
      taxDetails: info.taxDetails,
      policies: info.policies,
    });
    toast.success('Company details filled from GST');
  };

  if (!isAdmin && !isOwner) {
    // Read-only view for Staff
    // Or we can just let them see the "Policies" tab primarily
  }

  const handleSubmit = async () => {
    try {
      const info = {
        name: formData.name,
        address: formData.address,
        contact: `${formData.contactEmail}|${formData.contactPhone}`,
        gst: formData.gst,
        taxDetails: formData.taxDetails,
        policies: formData.policies,
      };

      await saveCompanyInfo.mutateAsync(info);
      toast.success('Company information saved successfully');
    } catch (error) {
      toast.error('Failed to save company information');
      console.error(error);
    }
  };

  const ownerDepartments = useMemo(() => {
    if (!isOwner && !isAdmin) return [];
    const staffUsers = users.filter(u => u.role && (u.role.hasOwnProperty('staff') || u.role.hasOwnProperty('intern') || u.role.hasOwnProperty('freelancer')));
    const deptMap = new Map();

    staffUsers.forEach(u => {
      const deptKey = u.department || 'Unassigned';
      if (!deptMap.has(deptKey)) {
        deptMap.set(deptKey, { department: deptKey, staff: [] });
      }
      deptMap.get(deptKey).staff.push(u);
    });

    return Array.from(deptMap.values()).sort((a, b) =>
      a.department.localeCompare(b.department),
    );
  }, [users, isOwner, isAdmin]);

  const departmentCards = useMemo(() => {
    return ownerDepartments.map(dept => {
      const totalStaff = dept.staff.length;
      const activeStaff = totalStaff;
      const inactiveStaff = 0;
      return {
        name: dept.department,
        totalStaff,
        activeStaff,
        inactiveStaff,
      };
    });
  }, [ownerDepartments]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {isOwner || isAdmin ? 'Department Overview' : 'Company Details'}
        </h2>
        {(isAdmin || isOwner) && (
          <Button onClick={handleSubmit} disabled={saveCompanyInfo.isPending}>
            {saveCompanyInfo.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {(isOwner || isAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Departments at a Glance</CardTitle>
          </CardHeader>
          <CardContent>
            {departmentCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No departments found. Add staff with department information to see an overview.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departmentCards.map(dept => (
                  <div
                    key={dept.name}
                    className="border rounded-lg p-4 flex flex-col gap-2 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{dept.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Total Staff: {dept.totalStaff}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 px-2 py-0.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Active: {dept.activeStaff}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        Inactive: {dept.inactiveStaff}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="reGen Innovations Inc."
                        disabled={!isAdmin && !isOwner}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="address">Registered Address</Label>
                    <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Enterprise Drive, Suite 400..."
                        disabled={!isAdmin && !isOwner}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input
                        id="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder="contact@regen.com"
                        disabled={!isAdmin && !isOwner}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input
                        id="phone"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        disabled={!isAdmin && !isOwner}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="gst">GST/VAT Identification Number</Label>
                    <div className="flex gap-2">
                      <Input
                          id="gst"
                          value={formData.gst}
                          onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                          placeholder="GSTIN..."
                          disabled={!isAdmin && !isOwner}
                      />
                      {(isAdmin || isOwner) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGstAutofill}
                        >
                          Fetch
                        </Button>
                      )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tax">Tax Identification Number</Label>
                    <Input
                        id="tax"
                        value={formData.taxDetails}
                        onChange={(e) => setFormData({ ...formData, taxDetails: e.target.value })}
                        placeholder="TX-1234567..."
                        disabled={!isAdmin && !isOwner}
                    />
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea
                  value={formData.policies}
                  onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                  placeholder="Welcome to reGen Innovations Inc. Our Terms and Conditions..."
                  className="min-h-[400px] font-light text-sm leading-relaxed"
                  disabled={!isAdmin && !isOwner}
                />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4 mt-4">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Company Policies</h3>
              {(isAdmin || isOwner) && (
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Policy
                </Button>
              )}
          </div>
          <Card>
            <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="px-6">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="text-left">
                                <div className="font-medium">Remote Work Policy</div>
                                <div className="text-xs text-muted-foreground font-normal mt-1">Effective: January 1, 2023</div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            This policy outlines the guidelines and expectations for employees working remotely. It covers eligibility, communication protocols, equipment, and data security measures.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2" className="px-6">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="text-left">
                                <div className="font-medium">Data Security Policy</div>
                                <div className="text-xs text-muted-foreground font-normal mt-1">Effective: February 15, 2023</div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Guidelines for protecting company data and sensitive information.
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-3" className="px-6">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="text-left">
                                <div className="font-medium">Travel and Expense Policy</div>
                                <div className="text-xs text-muted-foreground font-normal mt-1">Effective: March 1, 2023</div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Procedures for business travel and expense reimbursement.
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-4" className="px-6 border-b-0">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="text-left">
                                <div className="font-medium">Code of Conduct</div>
                                <div className="text-xs text-muted-foreground font-normal mt-1">Effective: April 10, 2023</div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                            Expected behavior and ethical standards for all employees.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
